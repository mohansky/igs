import { createServerFn } from '@tanstack/react-start'
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  max,
  or,
  sql,
  sum,
} from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import {
  classes,
  effectiveClassId,
  feePayments,
  fees,
  studentFeePlans,
  studentProfiles,
  user,
} from '#/db/schema'
import { fyEndDate, fyStartDate } from '#/lib/financial-year'
import { schoolToday } from '#/lib/fee-math'
import { requireRole } from './auth-utils'
import { syncFeeFromPayments } from './fees'
import { getTuitionCategoryId } from './fee-categories'

// Concessions apply to tuition only. Old fees with no category count as
// possible tuition (most were bulk tuition fees); other categories never do.
const tuitionOrUncategorised = (tuitionId: number) =>
  or(isNull(fees.categoryId), eq(fees.categoryId, tuitionId))

// Fee plans are admin business. GET endpoints are also open to the read-only
// auditor (trustees); writes are admin-only. Never exposed to staff/parents.

const academicYear = z.string().regex(/^\d{4}-\d{2}$/, 'Expected e.g. 2026-27')
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

export const planType = z.enum(['standard', 'concession'])
export type PlanType = z.infer<typeof planType>

// "2026-27" -> 1 May 2026 – 30 Apr 2027 (the school/financial year).
function yearRange(year: string) {
  const startYear = Number(year.slice(0, 4))
  return { start: fyStartDate(startYear), end: fyEndDate(startYear) }
}

// All of a student's plans (newest year first), with who approved them.
export const listStudentFeePlans = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ studentProfileId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    return db
      .select({
        id: studentFeePlans.id,
        academicYear: studentFeePlans.academicYear,
        planType: studentFeePlans.planType,
        referenceFee: studentFeePlans.referenceFee,
        openFeeId: studentFeePlans.openFeeId,
        approvedOn: studentFeePlans.approvedOn,
        approvedByName: user.name,
        notes: studentFeePlans.notes,
      })
      .from(studentFeePlans)
      .leftJoin(user, eq(user.id, studentFeePlans.approvedByUserId))
      .where(eq(studentFeePlans.studentProfileId, data.studentProfileId))
      .orderBy(desc(studentFeePlans.academicYear))
  })

// What the "Change plan" dialog needs for one student + year: the student's
// fees in that year (to pick the one to convert) and a suggested reference fee.
export const getFeePlanOptions = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      studentProfileId: z.number().int().positive(),
      academicYear,
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const { start, end } = yearRange(data.academicYear)
    const tuitionId = await getTuitionCategoryId()

    const candidateFees = await db
      .select({
        id: fees.id,
        amount: fees.amount,
        dueDate: fees.dueDate,
        description: fees.description,
        paidAmount: fees.paidAmount,
        categoryId: fees.categoryId,
      })
      .from(fees)
      .where(
        and(
          eq(fees.studentUserId, String(data.studentProfileId)),
          eq(fees.isOpen, false),
          tuitionOrUncategorised(tuitionId),
          gte(fees.dueDate, start),
          lte(fees.dueDate, end),
        ),
      )
      .orderBy(fees.dueDate)

    // Suggest: the student's own tuition fee for the year (by category, then
    // by description for old fees), else the amount most used for tuition
    // fees in the student's class that year (bulk fees).
    const tuition =
      candidateFees.find((f) => f.categoryId === tuitionId) ??
      candidateFees.find((f) => /tuition/i.test(f.description ?? '')) ??
      candidateFees[0]
    let suggestedReferenceFee: number | null = tuition?.amount ?? null
    if (suggestedReferenceFee === null) {
      const [common] = await db
        .select({ amount: fees.amount, n: count() })
        .from(fees)
        .innerJoin(studentProfiles, eq(fees.studentUserId, studentProfiles.id))
        .where(
          and(
            sql`${effectiveClassId} = (SELECT COALESCE(current_class_id, class_id) FROM student_profiles WHERE id = ${data.studentProfileId})`,
            eq(fees.isOpen, false),
            tuitionOrUncategorised(tuitionId),
            gte(fees.dueDate, start),
            lte(fees.dueDate, end),
          ),
        )
        .groupBy(fees.amount)
        .orderBy(desc(count()))
        .limit(1)
      suggestedReferenceFee = common?.amount ?? null
    }

    return {
      candidateFees,
      suggestedReferenceFee,
      suggestedFeeId: tuition?.id ?? null,
    }
  })

// Set a student's plan for one academic year.
//  - To concession: the chosen fee (convertFeeId) becomes that year's open
//    fee, keeping its payments; with none chosen, a new open fee is created.
//  - Back to standard: the open fee becomes a normal fee again, with the
//    reference fee as its amount, so a balance and due date apply again.
export const setStudentFeePlan = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      studentProfileId: z.number().int().positive(),
      academicYear,
      planType,
      referenceFee: z.number().positive().optional(),
      convertFeeId: z.number().int().positive().optional(),
      approvedOn: dateString.optional(),
      notes: z.string().max(2000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireRole(['admin'])
    const { start } = yearRange(data.academicYear)
    const studentKey = String(data.studentProfileId)

    return db.transaction(async (tx) => {
      const tuitionId = await getTuitionCategoryId(tx)
      const [existing] = await tx
        .select()
        .from(studentFeePlans)
        .where(
          and(
            eq(studentFeePlans.studentProfileId, data.studentProfileId),
            eq(studentFeePlans.academicYear, data.academicYear),
          ),
        )
        .limit(1)
      const wasConcession = existing?.planType === 'concession'

      // Nothing recorded and nothing to change.
      if (!existing && data.planType === 'standard') {
        return { planType: 'standard' as const }
      }

      let openFeeId: number | null = null
      if (data.planType === 'concession') {
        if (data.referenceFee === undefined) {
          throw new Error('Enter the reference fee (the standard annual fee).')
        }
        openFeeId = wasConcession && existing ? existing.openFeeId : null
        if (!openFeeId && data.convertFeeId) {
          const [fee] = await tx
            .select({
              id: fees.id,
              studentUserId: fees.studentUserId,
              isOpen: fees.isOpen,
              categoryId: fees.categoryId,
            })
            .from(fees)
            .where(eq(fees.id, data.convertFeeId))
            .limit(1)
          if (!fee || fee.studentUserId !== studentKey) {
            throw new Error('That fee does not belong to this student.')
          }
          if (fee.categoryId !== null && fee.categoryId !== tuitionId) {
            throw new Error('Only a tuition fee can become a concession fee.')
          }
          // An old uncategorised fee becomes Tuition Fee as it's converted.
          await tx
            .update(fees)
            .set({
              isOpen: true,
              amount: 0,
              categoryId: tuitionId,
              updatedAt: new Date(),
            })
            .where(eq(fees.id, fee.id))
          openFeeId = fee.id
        } else if (!openFeeId) {
          const [created] = await tx
            .insert(fees)
            .values({
              studentUserId: studentKey,
              amount: 0,
              dueDate: start,
              description: `Tuition Fee ${data.academicYear}`,
              isOpen: true,
              status: 'open',
              categoryId: tuitionId,
            })
            .returning({ id: fees.id })
          openFeeId = created.id
        }
        await syncFeeFromPayments(openFeeId, tx)
      } else if (wasConcession && existing?.openFeeId) {
        const amount = existing.referenceFee
        if (!amount) {
          throw new Error(
            'No reference fee recorded; set the fee amount by editing the fee.',
          )
        }
        await tx
          .update(fees)
          .set({ isOpen: false, amount, updatedAt: new Date() })
          .where(eq(fees.id, existing.openFeeId))
        await syncFeeFromPayments(existing.openFeeId, tx)
      }

      const values = {
        planType: data.planType,
        referenceFee: data.planType === 'concession' ? data.referenceFee : null,
        openFeeId,
        approvedByUserId: session.user.id,
        approvedOn: data.approvedOn ?? schoolToday(),
        notes: data.notes ?? null,
        updatedAt: new Date(),
      }
      await tx
        .insert(studentFeePlans)
        .values({
          studentProfileId: data.studentProfileId,
          academicYear: data.academicYear,
          ...values,
        })
        .onConflictDoUpdate({
          target: [
            studentFeePlans.studentProfileId,
            studentFeePlans.academicYear,
          ],
          set: values,
        })
      return { planType: data.planType }
    })
  })

// Concession report for one academic year: what each concession family has
// paid against the standard fee, and the support that represents.
export const getConcessionReport = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ academicYear: academicYear.optional() }))
  .handler(async ({ data }) => {
    await requireRole(['admin'])

    const yearRows = await db
      .selectDistinct({ academicYear: studentFeePlans.academicYear })
      .from(studentFeePlans)
      .where(eq(studentFeePlans.planType, 'concession'))
    const years = yearRows
      .map((r) => r.academicYear)
      .sort((a, b) => b.localeCompare(a))

    const year = data.academicYear ?? years[0]
    if (!year) return { academicYear: null, ongoing: false, years, rows: [] }
    const { end } = yearRange(year)

    const plans = await db
      .select({
        studentProfileId: studentFeePlans.studentProfileId,
        studentName: studentProfiles.studentName,
        admissionNumber: studentProfiles.admissionNumber,
        className: classes.name,
        classSection: classes.section,
        referenceFee: studentFeePlans.referenceFee,
        openFeeId: studentFeePlans.openFeeId,
      })
      .from(studentFeePlans)
      .innerJoin(
        studentProfiles,
        eq(studentProfiles.id, studentFeePlans.studentProfileId),
      )
      .leftJoin(classes, sql`${classes.id} = ${effectiveClassId}`)
      .where(
        and(
          eq(studentFeePlans.academicYear, year),
          eq(studentFeePlans.planType, 'concession'),
        ),
      )

    const feeIds = plans
      .map((p) => p.openFeeId)
      .filter((id): id is number => id !== null)
    const totals =
      feeIds.length > 0
        ? await db
            .select({
              feeId: feePayments.feeId,
              received: sum(feePayments.amount),
              payments: count(),
              lastPaid: max(feePayments.paidDate),
            })
            .from(feePayments)
            .where(inArray(feePayments.feeId, feeIds))
            .groupBy(feePayments.feeId)
        : []
    const byFee = new Map(totals.map((t) => [t.feeId, t]))

    const rows = plans
      .map((p) => {
        const t = p.openFeeId !== null ? byFee.get(p.openFeeId) : undefined
        const received = Number(t?.received ?? 0)
        const referenceFee = p.referenceFee ?? 0
        return {
          studentProfileId: p.studentProfileId,
          studentName: p.studentName,
          admissionNumber: p.admissionNumber,
          className: p.className
            ? `${p.className}${p.classSection ? ` - ${p.classSection}` : ''}`
            : null,
          referenceFee,
          received,
          // Paying more than the standard fee isn't "negative support".
          concessionValue: Math.max(0, referenceFee - received),
          payments: t?.payments ?? 0,
          lastPaid: t?.lastPaid ?? null,
        }
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName))

    return {
      academicYear: year,
      ongoing: schoolToday() <= end,
      years,
      rows,
    }
  })
