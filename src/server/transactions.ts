import { createServerFn } from '@tanstack/react-start'
import { and, eq, desc, gte, lte, inArray, sql, isNotNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { transactions, fees, staffSalaries } from '#/db/schema'
import { fyEndDate, fyStartDate } from '#/lib/financial-year'
import { assertDatesUnlocked } from './accounting'
import { requireRole } from './auth-utils'

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

// `type` drives the income/expense SUM(CASE …) in the year-end summary, so it
// must be one of exactly two values. `category` is admin-curated (Supplies,
// Maintenance, …) rather than a fixed set, so it's bounded but not enumerated.
export const transactionType = z.enum(['income', 'expense'])
export type TransactionType = z.infer<typeof transactionType>
const optText = (max = 500) => z.string().max(max).nullish()

const transactionFields = {
  type: transactionType,
  category: z.string().trim().min(1).max(100),
  amount: z.number().positive(),
  date: dateString,
  description: optText(),
  paymentMethod: optText(50),
  receiptNumber: optText(100),
  vendor: optText(200),
  notes: optText(2000),
  attachmentUrl: optText(1000),
  attachmentType: z.enum(['file', 'link']).nullish(),
}

export const listTransactions = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({ fyStartYear: z.number().int().min(2000).max(2100).optional() }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const query = db.select().from(transactions)
    const filtered =
      data.fyStartYear != null
        ? query.where(
            and(
              gte(transactions.date, fyStartDate(data.fyStartYear)),
              lte(transactions.date, fyEndDate(data.fyStartYear)),
            ),
          )
        : query
    return filtered.orderBy(desc(transactions.date))
  })

export const createTransaction = createServerFn({ method: 'POST' })
  .inputValidator(z.object(transactionFields))
  .handler(async ({ data }) => {
    const session = await requireRole(['admin'])
    await assertDatesUnlocked(data.date)
    const result = await db
      .insert(transactions)
      .values({ ...data, createdByUserId: session.user.id })
      .returning()
    return result[0]
  })

export const updateTransaction = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.number().int().positive(),
      // Whitelisted: only these columns can be written, and only with valid
      // values — `updates` was previously an unvalidated free-form object.
      updates: z.object(transactionFields).partial(),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const [existing] = await db
      .select({ date: transactions.date })
      .from(transactions)
      .where(eq(transactions.id, data.id))
      .limit(1)
    if (!existing) throw new Error('Transaction not found')
    await assertDatesUnlocked(existing.date, data.updates.date)
    const result = await db
      .update(transactions)
      .set({ ...data.updates, updatedAt: new Date() })
      .where(eq(transactions.id, data.id))
      .returning()
    return result[0]
  })

export const deleteTransaction = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const [existing] = await db
      .select({ date: transactions.date })
      .from(transactions)
      .where(eq(transactions.id, data.id))
      .limit(1)
    if (!existing) throw new Error('Transaction not found')
    await assertDatesUnlocked(existing.date)
    await db.delete(transactions).where(eq(transactions.id, data.id))
    return { success: true }
  })

export const bulkDeleteTransactions = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({ ids: z.array(z.number().int().positive()).max(1000) }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    if (data.ids.length === 0) return { deleted: 0 }
    const rows = await db
      .select({ date: transactions.date })
      .from(transactions)
      .where(inArray(transactions.id, data.ids))
    await assertDatesUnlocked(...rows.map((r) => r.date))
    const result = await db
      .delete(transactions)
      .where(inArray(transactions.id, data.ids))
      .returning({ id: transactions.id })
    return { deleted: result.length }
  })

export type MonthlyOverviewRow = {
  month: string
  manualIncome: number
  feesCollected: number
  totalIncome: number
  manualExpenses: number
  salariesPaid: number
  totalExpenses: number
  net: number
}

export const getMonthlyOverview = createServerFn({ method: 'GET' }).handler(
  async (): Promise<MonthlyOverviewRow[]> => {
    await requireRole(['admin'])

    const txnRows = await db
      .select({
        month: sql<string>`substr(${transactions.date}, 1, 7)`,
        income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
        expenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .groupBy(sql`substr(${transactions.date}, 1, 7)`)

    const feeRows = await db
      .select({
        month: sql<string>`substr(${fees.paidDate}, 1, 7)`,
        collected: sql<number>`COALESCE(SUM(${fees.paidAmount}), 0)`,
      })
      .from(fees)
      .where(isNotNull(fees.paidDate))
      .groupBy(sql`substr(${fees.paidDate}, 1, 7)`)

    const salaryRows = await db
      .select({
        month: sql<string>`substr(${staffSalaries.paidDate}, 1, 7)`,
        paid: sql<number>`COALESCE(SUM(${staffSalaries.netPay}), 0)`,
      })
      .from(staffSalaries)
      .where(isNotNull(staffSalaries.paidDate))
      .groupBy(sql`substr(${staffSalaries.paidDate}, 1, 7)`)

    const merged = new Map<string, MonthlyOverviewRow>()
    const ensure = (month: string): MonthlyOverviewRow => {
      let row = merged.get(month)
      if (!row) {
        row = {
          month,
          manualIncome: 0,
          feesCollected: 0,
          totalIncome: 0,
          manualExpenses: 0,
          salariesPaid: 0,
          totalExpenses: 0,
          net: 0,
        }
        merged.set(month, row)
      }
      return row
    }

    for (const r of txnRows) {
      const row = ensure(r.month)
      row.manualIncome = Number(r.income) || 0
      row.manualExpenses = Number(r.expenses) || 0
    }
    for (const r of feeRows) {
      ensure(r.month).feesCollected = Number(r.collected) || 0
    }
    for (const r of salaryRows) {
      ensure(r.month).salariesPaid = Number(r.paid) || 0
    }

    for (const row of merged.values()) {
      row.totalIncome = row.manualIncome + row.feesCollected
      row.totalExpenses = row.manualExpenses + row.salariesPaid
      row.net = row.totalIncome - row.totalExpenses
    }

    return Array.from(merged.values()).sort((a, b) =>
      b.month.localeCompare(a.month),
    )
  },
)
