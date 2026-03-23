import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { db } from '#/db'
import { fees, studentProfiles, classes } from '#/db/schema'
import { requireRole } from './auth-utils'

export const createFeeRecord = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      studentUserId: string
      amount: number
      dueDate: string
      description?: string
      notes?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const result = await db.insert(fees).values(data).returning()
    return result[0]
  })

export const recordPayment = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      feeId: number
      paidAmount: number
      paymentMethod: string
      receiptNumber?: string
      notes?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const session = await requireRole(['admin', 'staff'])

    const [existing] = await db
      .select()
      .from(fees)
      .where(eq(fees.id, data.feeId))
      .limit(1)

    if (!existing) throw new Error('Fee record not found')

    const totalPaid = (existing.paidAmount ?? 0) + data.paidAmount
    const status = totalPaid >= existing.amount ? 'paid' : 'partial'

    const result = await db
      .update(fees)
      .set({
        paidAmount: totalPaid,
        paidDate: new Date().toISOString().split('T')[0],
        status,
        paymentMethod: data.paymentMethod,
        receiptNumber: data.receiptNumber,
        notes: data.notes,
        receivedByUserId: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(fees.id, data.feeId))
      .returning()

    return result[0]
  })

export const getStudentFees = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { studentUserId?: string; studentProfileId?: number }) => data,
  )
  .handler(async ({ data }) => {
    // If querying by profile ID (for parent viewing child's fees)
    if (data.studentProfileId) {
      const result = await db
        .select()
        .from(fees)
        .where(eq(fees.studentUserId, String(data.studentProfileId)))
      return result
    }
    if (data.studentUserId) {
      const result = await db
        .select()
        .from(fees)
        .where(eq(fees.studentUserId, data.studentUserId))
      return result
    }
    return []
  })

export const deleteFeeRecord = createServerFn({ method: 'POST' })
  .inputValidator((data: { feeId: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
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
    await requireRole(['admin', 'staff'])
    const { feeId, ...updates } = data
    const result = await db
      .update(fees)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(fees.id, feeId))
      .returning()
    return result[0]
  })

export const listFees = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { status?: string; studentUserId?: string }) => data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])

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
        description: fees.description,
        notes: fees.notes,
        studentName: studentProfiles.studentName,
        admissionNumber: studentProfiles.admissionNumber,
      })
      .from(fees)
      .leftJoin(
        studentProfiles,
        eq(fees.studentUserId, studentProfiles.userId),
      )

    const result =
      conditions.length > 0
        ? await baseQuery.where(and(...conditions))
        : await baseQuery

    return result
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
    await requireRole(['admin', 'staff'])

    // Get all active students in the class
    const students = await db
      .select({ id: studentProfiles.id, studentName: studentProfiles.studentName })
      .from(studentProfiles)
      .where(
        and(
          eq(studentProfiles.classId, data.classId),
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
