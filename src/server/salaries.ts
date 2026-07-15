import { createServerFn } from '@tanstack/react-start'
import { eq, desc, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { staffSalaries, user } from '#/db/schema'
import { assertDatesUnlocked } from './accounting'
import { requireRole } from './auth-utils'

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
const monthString = z.string().regex(/^\d{4}-\d{2}$/, 'Expected YYYY-MM')

// Money: must be a finite, non-negative number — not NaN/Infinity, and never
// negative, which would silently corrupt payroll totals.
const money = z.number().finite().nonnegative()
const salaryStatus = z.enum(['pending', 'paid'])

export const listSalaries = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin'])
    return db
      .select()
      .from(staffSalaries)
      .orderBy(desc(staffSalaries.month), staffSalaries.staffName)
  },
)

export const listStaffForSalary = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin'])
    return db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.role, 'staff'))
  },
)

export const createSalary = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      userId: z.string().min(1),
      staffName: z.string().trim().min(1).max(200),
      designation: z.string().max(200).optional(),
      month: monthString,
      basicPay: money,
      allowances: money.optional(),
      deductions: money.optional(),
      netPay: money,
      paymentMethod: z.string().max(50).optional(),
      notes: z.string().max(2000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireRole(['admin'])
    const result = await db
      .insert(staffSalaries)
      .values({ ...data, createdByUserId: session.user.id })
      .returning()
    return result[0]
  })

export const updateSalary = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.number().int().positive(),
      updates: z.object({
        basicPay: money.optional(),
        allowances: money.optional(),
        deductions: money.optional(),
        netPay: money.optional(),
        designation: z.string().max(200).optional(),
        paymentMethod: z.string().max(50).optional(),
        status: salaryStatus.optional(),
        paidDate: dateString.nullish(),
        notes: z.string().max(2000).optional(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const [existing] = await db
      .select({ paidDate: staffSalaries.paidDate })
      .from(staffSalaries)
      .where(eq(staffSalaries.id, data.id))
      .limit(1)
    if (!existing) throw new Error('Salary record not found')
    await assertDatesUnlocked(existing.paidDate, data.updates.paidDate)
    const result = await db
      .update(staffSalaries)
      .set({ ...data.updates, updatedAt: new Date() })
      .where(eq(staffSalaries.id, data.id))
      .returning()
    return result[0]
  })

export const deleteSalary = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const [existing] = await db
      .select({ paidDate: staffSalaries.paidDate })
      .from(staffSalaries)
      .where(eq(staffSalaries.id, data.id))
      .limit(1)
    if (!existing) throw new Error('Salary record not found')
    await assertDatesUnlocked(existing.paidDate)
    await db.delete(staffSalaries).where(eq(staffSalaries.id, data.id))
    return { success: true }
  })

export const markSalaryPaid = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.number().int().positive(),
      paymentMethod: z.string().min(1).max(50),
      paidDate: dateString,
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const [existing] = await db
      .select({ paidDate: staffSalaries.paidDate })
      .from(staffSalaries)
      .where(eq(staffSalaries.id, data.id))
      .limit(1)
    if (!existing) throw new Error('Salary record not found')
    await assertDatesUnlocked(existing.paidDate, data.paidDate)
    const result = await db
      .update(staffSalaries)
      .set({
        status: 'paid',
        paidDate: data.paidDate,
        paymentMethod: data.paymentMethod,
        updatedAt: new Date(),
      })
      .where(eq(staffSalaries.id, data.id))
      .returning()
    return result[0]
  })

export const bulkMarkSalariesPaid = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      salaryIds: z.array(z.number().int().positive()).max(1000),
      paymentMethod: z.string().min(1).max(50),
      paidDate: dateString,
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    if (data.salaryIds.length === 0) return { updated: 0 }
    const rows = await db
      .select({ paidDate: staffSalaries.paidDate })
      .from(staffSalaries)
      .where(inArray(staffSalaries.id, data.salaryIds))
    await assertDatesUnlocked(data.paidDate, ...rows.map((r) => r.paidDate))
    const result = await db
      .update(staffSalaries)
      .set({
        status: 'paid',
        paidDate: data.paidDate,
        paymentMethod: data.paymentMethod,
        updatedAt: new Date(),
      })
      .where(inArray(staffSalaries.id, data.salaryIds))
      .returning({ id: staffSalaries.id })
    return { updated: result.length }
  })

export const bulkDeleteSalaries = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({ salaryIds: z.array(z.number().int().positive()).max(1000) }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    if (data.salaryIds.length === 0) return { deleted: 0 }
    const rows = await db
      .select({ paidDate: staffSalaries.paidDate })
      .from(staffSalaries)
      .where(inArray(staffSalaries.id, data.salaryIds))
    await assertDatesUnlocked(...rows.map((r) => r.paidDate))
    const result = await db
      .delete(staffSalaries)
      .where(inArray(staffSalaries.id, data.salaryIds))
      .returning({ id: staffSalaries.id })
    return { deleted: result.length }
  })
