import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '#/db'
import {
  classes,
  effectiveClassId,
  feePayments,
  fees,
  studentParents,
  studentProfiles,
  user,
} from '#/db/schema'
import { z } from 'zod'
import { assertDatesUnlocked } from './accounting'
import { requireRole } from './auth-utils'

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

// The handle drizzle hands to a `db.transaction()` callback. Money writes take
// one of these so the ledger row and the cached `fees` row commit together.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

// Amounts are stored as SQLite REAL, so compare with a sub-paisa tolerance
// rather than exact equality.
const AMOUNT_EPSILON = 0.005

const todayDateString = () => new Date().toISOString().slice(0, 10)

// Student profile ids (as strings, matching fees.studentUserId) that this
// user may act on: their own profile plus children linked via student_parents.
export async function allowedStudentProfileIds(
  userId: string,
): Promise<Set<string>> {
  const own = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, userId))
  const linked = await db
    .select({ id: studentParents.studentProfileId })
    .from(studentParents)
    .where(eq(studentParents.parentUserId, userId))
  return new Set([...own, ...linked].map((r) => String(r.id)))
}

// Deleting a fee cascades to its payments, so it must not remove
// payments recorded in a closed financial year.
async function assertFeePaymentsUnlocked(feeIds: Array<number>) {
  if (feeIds.length === 0) return
  const rows = await db
    .select({ paidDate: feePayments.paidDate })
    .from(feePayments)
    .where(inArray(feePayments.feeId, feeIds))
  await assertDatesUnlocked(...rows.map((r) => r.paidDate))
}

// Recompute the fees-row cache from the payment ledger: paidAmount, status,
// and "latest payment" metadata are all derived from fee_payments rows.
async function syncFeeFromPayments(feeId: number, tx: Tx) {
  const [existing] = await tx
    .select({ amount: fees.amount })
    .from(fees)
    .where(eq(fees.id, feeId))
    .limit(1)
  if (!existing) throw new Error('Fee record not found')

  const [{ total }] = await tx
    .select({ total: sql<number>`COALESCE(SUM(${feePayments.amount}), 0)` })
    .from(feePayments)
    .where(eq(feePayments.feeId, feeId))

  const [latest] = await tx
    .select()
    .from(feePayments)
    .where(eq(feePayments.feeId, feeId))
    .orderBy(sql`paid_date DESC, id DESC`)
    .limit(1)

  const paidAmount = Number(total) || 0
  const status =
    paidAmount <= 0
      ? 'pending'
      : paidAmount >= existing.amount
        ? 'paid'
        : 'partial'

  const [updated] = await tx
    .update(fees)
    .set({
      paidAmount,
      status,
      paidDate: latest?.paidDate ?? null,
      paymentMethod: latest?.paymentMethod ?? null,
      receiptNumber: latest?.receiptNumber ?? null,
      razorpayOrderId: latest?.razorpayOrderId ?? null,
      razorpayPaymentId: latest?.razorpayPaymentId ?? null,
      receivedByUserId: latest?.receivedByUserId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(fees.id, feeId))
    .returning()
  return updated
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const withIsOverdue = <T extends { status: string; dueDate: string }>(
  row: T,
  today: string,
): T & { isOverdue: boolean } => ({
  ...row,
  isOverdue: row.status !== 'paid' && row.dueDate < today,
})

export const createFeeRecord = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      studentUserId: z.string().min(1),
      amount: z.number().positive(),
      dueDate: dateString,
      description: z.string().max(500).optional(),
      notes: z.string().max(2000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const result = await db.insert(fees).values(data).returning()
    return result[0]
  })

export const recordPayment = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      feeId: z.number().int().positive(),
      paidAmount: z.number().positive(),
      paymentMethod: z.string().min(1).max(50),
      paidDate: dateString.optional(),
      receiptNumber: z.string().max(100).optional(),
      notes: z.string().max(2000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireRole(['admin'])

    const paidDate = data.paidDate || todayDateString()
    await assertDatesUnlocked(paidDate)

    // Ledger insert + cached-row sync must commit together, or `fees` drifts
    // from `fee_payments`.
    return db.transaction(async (tx) => {
      const [fee] = await tx
        .select({ amount: fees.amount, paidAmount: fees.paidAmount })
        .from(fees)
        .where(eq(fees.id, data.feeId))
        .limit(1)
      if (!fee) throw new Error('Fee record not found')

      const remaining = fee.amount - (fee.paidAmount ?? 0)
      if (remaining <= AMOUNT_EPSILON) {
        throw new Error('This fee is already fully paid.')
      }
      if (data.paidAmount > remaining + AMOUNT_EPSILON) {
        throw new Error(
          `Payment of ${data.paidAmount} exceeds the outstanding balance of ${remaining}.`,
        )
      }

      const [payment] = await tx
        .insert(feePayments)
        .values({
          feeId: data.feeId,
          amount: data.paidAmount,
          paidDate,
          paymentMethod: data.paymentMethod,
          receiptNumber: data.receiptNumber ?? null,
          notes: data.notes ?? null,
          receivedByUserId: session.user.id,
        })
        .returning()

      const updatedFee = await syncFeeFromPayments(data.feeId, tx)

      return { ...updatedFee, paymentId: payment.id }
    })
  })

export const getStudentFees = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { studentUserId?: string; studentProfileId?: number }) => data,
  )
  .handler(async ({ data }) => {
    const session = await requireRole(['admin', 'student'])
    const role = (session.user as { role?: string }).role ?? 'student'

    // Students/parents may only query their own profile or a linked child;
    // fees.studentUserId stores the student profile id as a string. Admin and
    // the view-only auditor may query any profile.
    if (role !== 'admin' && role !== 'auditor') {
      const requested =
        data.studentProfileId != null
          ? String(data.studentProfileId)
          : data.studentUserId
      if (!requested) return []
      const allowed = await allowedStudentProfileIds(session.user.id)
      if (!allowed.has(String(requested))) {
        throw new Error('Forbidden')
      }
    }

    const today = todayIso()
    const buildQuery = () =>
      db
        .select({
          id: fees.id,
          studentUserId: fees.studentUserId,
          amount: fees.amount,
          dueDate: fees.dueDate,
          paidDate: fees.paidDate,
          paidAmount: fees.paidAmount,
          status: fees.status,
          paymentMethod: fees.paymentMethod,
          receiptNumber: fees.receiptNumber,
          razorpayOrderId: fees.razorpayOrderId,
          razorpayPaymentId: fees.razorpayPaymentId,
          description: fees.description,
          notes: fees.notes,
          receivedByUserId: fees.receivedByUserId,
          receivedByName: user.name,
        })
        .from(fees)
        .leftJoin(user, eq(user.id, fees.receivedByUserId))

    // If querying by profile ID (for parent viewing child's fees)
    if (data.studentProfileId) {
      const result = await buildQuery().where(
        eq(fees.studentUserId, String(data.studentProfileId)),
      )
      return result.map((r) => withIsOverdue(r, today))
    }
    if (data.studentUserId) {
      const result = await buildQuery().where(
        eq(fees.studentUserId, data.studentUserId),
      )
      return result.map((r) => withIsOverdue(r, today))
    }
    return []
  })

export const deleteFeeRecord = createServerFn({ method: 'POST' })
  .inputValidator((data: { feeId: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await assertFeePaymentsUnlocked([data.feeId])
    await db.delete(fees).where(eq(fees.id, data.feeId))
    return { success: true }
  })

export const updateFeeRecord = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      feeId: number
      studentUserId?: string
      amount?: number
      dueDate?: string
      description?: string
      status?: string
      notes?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const session = await requireRole(['admin'])
    const { feeId, ...updates } = data

    // If status is being changed, record who did it
    let statusChangerPatch: { receivedByUserId?: string } = {}
    if (updates.status) {
      const [existing] = await db
        .select({ status: fees.status })
        .from(fees)
        .where(eq(fees.id, feeId))
        .limit(1)
      if (existing && existing.status !== updates.status) {
        statusChangerPatch = { receivedByUserId: session.user.id }
      }
    }

    const result = await db
      .update(fees)
      .set({ ...updates, ...statusChangerPatch, updatedAt: new Date() })
      .where(eq(fees.id, feeId))
      .returning()
    return result[0]
  })

export const listFees = createServerFn({ method: 'GET' })
  .inputValidator((data: { status?: string; studentUserId?: string }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])

    const conditions = []
    if (data.status) {
      conditions.push(eq(fees.status, data.status))
    }
    if (data.studentUserId) {
      conditions.push(eq(fees.studentUserId, data.studentUserId))
    }

    const baseQuery = db
      .select({
        id: fees.id,
        studentUserId: fees.studentUserId,
        studentProfileId: studentProfiles.id,
        amount: fees.amount,
        dueDate: fees.dueDate,
        paidDate: fees.paidDate,
        paidAmount: fees.paidAmount,
        status: fees.status,
        paymentMethod: fees.paymentMethod,
        receiptNumber: fees.receiptNumber,
        razorpayOrderId: fees.razorpayOrderId,
        razorpayPaymentId: fees.razorpayPaymentId,
        description: fees.description,
        notes: fees.notes,
        studentName: studentProfiles.studentName,
        admissionNumber: studentProfiles.admissionNumber,
        classId: classes.id,
        className: classes.name,
        classSection: classes.section,
        receivedByUserId: fees.receivedByUserId,
        receivedByName: user.name,
      })
      .from(fees)
      .leftJoin(studentProfiles, eq(fees.studentUserId, studentProfiles.id))
      .leftJoin(classes, sql`${classes.id} = ${effectiveClassId}`)
      .leftJoin(user, eq(user.id, fees.receivedByUserId))

    const result =
      conditions.length > 0
        ? await baseQuery.where(and(...conditions))
        : await baseQuery

    const today = todayIso()
    return result.map((r) => withIsOverdue(r, today))
  })

export const bulkMarkFeesPaid = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { feeIds: number[]; paymentMethod: string; paidDate: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    const session = await requireRole(['admin'])
    if (data.feeIds.length === 0) return { updated: 0 }
    await assertDatesUnlocked(data.paidDate)

    const rows = await db
      .select()
      .from(fees)
      .where(inArray(fees.id, data.feeIds))

    return db.transaction(async (tx) => {
      let updated = 0
      for (const row of rows) {
        const remaining = row.amount - (row.paidAmount ?? 0)
        if (remaining > AMOUNT_EPSILON) {
          await tx.insert(feePayments).values({
            feeId: row.id,
            amount: remaining,
            paidDate: data.paidDate,
            paymentMethod: data.paymentMethod,
            receivedByUserId: session.user.id,
          })
        }
        await syncFeeFromPayments(row.id, tx)
        updated++
      }
      return { updated }
    })
  })

export const bulkDeleteFees = createServerFn({ method: 'POST' })
  .inputValidator((data: { feeIds: number[] }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    if (data.feeIds.length === 0) return { deleted: 0 }
    await assertFeePaymentsUnlocked(data.feeIds)
    const result = await db
      .delete(fees)
      .where(inArray(fees.id, data.feeIds))
      .returning({ id: fees.id })
    return { deleted: result.length }
  })

export const createBulkFees = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      classId: number
      amount: number
      dueDate: string
      description?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])

    // Get all active students in the class
    const students = await db
      .select({
        id: studentProfiles.id,
        studentName: studentProfiles.studentName,
      })
      .from(studentProfiles)
      .where(
        and(
          sql`${effectiveClassId} = ${data.classId}`,
          eq(studentProfiles.isActive, true),
        ),
      )

    if (students.length === 0) {
      throw new Error('No active students found in this class')
    }

    const records = students.map((s) => ({
      studentUserId: String(s.id),
      amount: data.amount,
      dueDate: data.dueDate,
      description: data.description,
    }))

    await db.insert(fees).values(records)

    return { created: students.length }
  })

export const listFeePayments = createServerFn({ method: 'GET' })
  .inputValidator((data: { feeId: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    return db
      .select({
        id: feePayments.id,
        feeId: feePayments.feeId,
        amount: feePayments.amount,
        paidDate: feePayments.paidDate,
        paymentMethod: feePayments.paymentMethod,
        receiptNumber: feePayments.receiptNumber,
        razorpayOrderId: feePayments.razorpayOrderId,
        razorpayPaymentId: feePayments.razorpayPaymentId,
        notes: feePayments.notes,
        receivedByUserId: feePayments.receivedByUserId,
        receivedByName: user.name,
        createdAt: feePayments.createdAt,
      })
      .from(feePayments)
      .leftJoin(user, eq(user.id, feePayments.receivedByUserId))
      .where(eq(feePayments.feeId, data.feeId))
      .orderBy(feePayments.paidDate, feePayments.id)
  })

export const deleteFeePayment = createServerFn({ method: 'POST' })
  .inputValidator((data: { paymentId: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])

    const [existing] = await db
      .select({
        id: feePayments.id,
        feeId: feePayments.feeId,
        paidDate: feePayments.paidDate,
      })
      .from(feePayments)
      .where(eq(feePayments.id, data.paymentId))
      .limit(1)
    if (!existing) throw new Error('Payment not found')
    await assertDatesUnlocked(existing.paidDate)

    await db.transaction(async (tx) => {
      await tx.delete(feePayments).where(eq(feePayments.id, data.paymentId))
      await syncFeeFromPayments(existing.feeId, tx)
    })

    return { success: true }
  })
