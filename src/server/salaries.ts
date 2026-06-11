import { createServerFn } from '@tanstack/react-start'
import { eq, desc, inArray } from 'drizzle-orm'
import { db } from '#/db'
import { staffSalaries, user } from '#/db/schema'
import { assertDatesUnlocked } from './accounting'
import { requireRole } from './auth-utils'

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
    (data: {
      userId: string
      staffName: string
      designation?: string
      month: string
      basicPay: number
      allowances?: number
      deductions?: number
      netPay: number
      paymentMethod?: string
      notes?: string
    }) => data,
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
    (data: {
      id: number
      updates: {
        basicPay?: number
        allowances?: number
        deductions?: number
        netPay?: number
        designation?: string
        paymentMethod?: string
        status?: string
        paidDate?: string | null
        notes?: string
      }
    }) => data,
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
  .inputValidator((data: { id: number }) => data)
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
    (data: { id: number; paymentMethod: string; paidDate: string }) => data,
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
    (data: { salaryIds: number[]; paymentMethod: string; paidDate: string }) =>
      data,
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
  .inputValidator((data: { salaryIds: number[] }) => data)
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
