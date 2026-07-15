import { createServerFn } from '@tanstack/react-start'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '#/db'
import {
  appSettings,
  feePayments,
  staffSalaries,
  transactions,
} from '#/db/schema'
import {
  currentFyStartYear,
  fyEndDate,
  fyStartDate,
  fyStartYearOf,
} from '#/lib/financial-year'
import { requireRole } from './auth-utils'
import { z } from 'zod'

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

const BOOKS_LOCKED_THROUGH_KEY = 'books_locked_through'

export async function getBooksLockedThrough(): Promise<string | null> {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, BOOKS_LOCKED_THROUGH_KEY))
    .limit(1)
  return row?.value ?? null
}

export function assertUnlocked(
  date: string | null | undefined,
  lockedThrough: string | null,
): void {
  if (!date || !lockedThrough) return
  if (date.slice(0, 10) <= lockedThrough) {
    throw new Error(
      `Books are closed through ${lockedThrough}. Entries dated on or before this cannot be added, changed, or deleted.`,
    )
  }
}

// Convenience: fetch the lock date once and check one or more entry dates.
export async function assertDatesUnlocked(
  ...dates: Array<string | null | undefined>
): Promise<void> {
  const lockedThrough = await getBooksLockedThrough()
  if (!lockedThrough) return
  for (const date of dates) assertUnlocked(date, lockedThrough)
}

export const getAccountingSettings = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin'])
    return { booksLockedThrough: await getBooksLockedThrough() }
  },
)

export const setBooksLockedThrough = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ date: dateString.nullable() }))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    if (data.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new Error('Lock date must be in YYYY-MM-DD format')
    }
    await db
      .insert(appSettings)
      .values({ key: BOOKS_LOCKED_THROUGH_KEY, value: data.date })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: data.date, updatedAt: new Date() },
      })
    return { booksLockedThrough: data.date }
  })

// Distinct financial years (by start year, descending) that have any money
// activity, always including the current year so it appears before its
// first entry exists.
export const listFinancialYears = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<number>> => {
    await requireRole(['admin'])

    const [txn] = await db
      .select({
        min: sql<string | null>`MIN(${transactions.date})`,
        max: sql<string | null>`MAX(${transactions.date})`,
      })
      .from(transactions)
    const [pay] = await db
      .select({
        min: sql<string | null>`MIN(${feePayments.paidDate})`,
        max: sql<string | null>`MAX(${feePayments.paidDate})`,
      })
      .from(feePayments)
    const [sal] = await db
      .select({
        min: sql<string | null>`MIN(${staffSalaries.paidDate})`,
        max: sql<string | null>`MAX(${staffSalaries.paidDate})`,
      })
      .from(staffSalaries)

    const current = currentFyStartYear()
    const mins = [txn.min, pay.min, sal.min].filter(Boolean) as Array<string>
    const maxes = [txn.max, pay.max, sal.max].filter(Boolean) as Array<string>
    const minFy = mins.length ? Math.min(...mins.map(fyStartYearOf)) : current
    const maxFy = Math.max(current, ...maxes.map(fyStartYearOf))

    const years: Array<number> = []
    for (let y = maxFy; y >= minFy; y--) years.push(y)
    return years
  },
)

export type YearEndSummary = {
  fyStartYear: number
  start: string
  end: string
  manualIncome: number
  feesCollected: number
  totalIncome: number
  manualExpenses: number
  salariesPaid: number
  totalExpenses: number
  net: number
}

export const getYearEndSummary = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({ fyStartYear: z.number().int().min(2000).max(2100) }),
  )
  .handler(async ({ data }): Promise<YearEndSummary> => {
    await requireRole(['admin'])
    const start = fyStartDate(data.fyStartYear)
    const end = fyEndDate(data.fyStartYear)

    const [txn] = await db
      .select({
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
        expenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(and(gte(transactions.date, start), lte(transactions.date, end)))

    // Sum the payment ledger (not the cached fees columns) so split
    // payments land in the year they were actually received.
    const [pay] = await db
      .select({
        collected: sql<number>`COALESCE(SUM(${feePayments.amount}), 0)`,
      })
      .from(feePayments)
      .where(
        and(gte(feePayments.paidDate, start), lte(feePayments.paidDate, end)),
      )

    const [sal] = await db
      .select({
        paid: sql<number>`COALESCE(SUM(${staffSalaries.netPay}), 0)`,
      })
      .from(staffSalaries)
      .where(
        and(
          gte(staffSalaries.paidDate, start),
          lte(staffSalaries.paidDate, end),
        ),
      )

    const manualIncome = Number(txn.income) || 0
    const manualExpenses = Number(txn.expenses) || 0
    const feesCollected = Number(pay.collected) || 0
    const salariesPaid = Number(sal.paid) || 0
    const totalIncome = manualIncome + feesCollected
    const totalExpenses = manualExpenses + salariesPaid

    return {
      fyStartYear: data.fyStartYear,
      start,
      end,
      manualIncome,
      feesCollected,
      totalIncome,
      manualExpenses,
      salariesPaid,
      totalExpenses,
      net: totalIncome - totalExpenses,
    }
  })
