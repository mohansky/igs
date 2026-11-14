import { createServerFn } from '@tanstack/react-start'
import {
  and,
  eq,
  desc,
  gte,
  lte,
  inArray,
  sql,
  isNotNull,
  getTableColumns,
} from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { transactions, feePayments, staffSalaries, user } from '#/db/schema'
import { fyEndDate, fyStartDate } from '#/lib/financial-year'
import { isValidCategory, needsDescription } from '#/lib/transaction-categories'
import {
  MAX_SPLIT_LINES,
  MIN_SPLIT_LINES,
  splitAddsUp,
} from '#/lib/transaction-split'
import { assertDatesUnlocked } from './accounting'
import { requireRole } from './auth-utils'

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

// `type` drives the income/expense SUM(CASE …) in the year-end summary, so it
// must be one of exactly two values. `category` must be one of that type's
// categories in src/lib/transaction-categories.ts (checked in the handlers,
// since an edit may keep a row's older category).
export const transactionType = z.enum(['income', 'expense'])
export type TransactionType = z.infer<typeof transactionType>
const optText = (max = 500) => z.string().max(max).nullish()

// Throws unless the category is allowed for the type, and an "Other" entry
// has a description. `keep` is the row's category before an edit: leaving
// it unchanged is allowed even if it's no longer in the list.
function assertCategory(
  t: { type: TransactionType; category: string; description?: string | null },
  keep?: { type: TransactionType; category: string },
) {
  const unchanged = keep && keep.type === t.type && keep.category === t.category
  if (!unchanged && !isValidCategory(t.type, t.category)) {
    throw new Error(`"${t.category}" is not a ${t.type} category.`)
  }
  if (needsDescription(t.category) && !t.description?.trim()) {
    throw new Error('Add a description for a transaction in "Other".')
  }
}

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
    const query = db
      .select({ ...getTableColumns(transactions), createdByName: user.name })
      .from(transactions)
      .leftJoin(user, eq(user.id, transactions.createdByUserId))
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
    assertCategory(data)
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
    const existing = (
      await db
        .select({
          date: transactions.date,
          type: transactions.type,
          category: transactions.category,
          description: transactions.description,
        })
        .from(transactions)
        .where(eq(transactions.id, data.id))
        .limit(1)
    ).at(0)
    if (!existing) throw new Error('Transaction not found')
    const before = {
      type: existing.type as TransactionType,
      category: existing.category,
    }
    assertCategory(
      {
        type: data.updates.type ?? before.type,
        category: data.updates.category ?? before.category,
        description:
          data.updates.description !== undefined
            ? data.updates.description
            : existing.description,
      },
      before,
    )
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
    const existing = (
      await db
        .select({ date: transactions.date })
        .from(transactions)
        .where(eq(transactions.id, data.id))
        .limit(1)
    ).at(0)
    if (!existing) throw new Error('Transaction not found')
    await assertDatesUnlocked(existing.date)
    await db.delete(transactions).where(eq(transactions.id, data.id))
    return { success: true }
  })

// Replace one transaction with 2+ lines (e.g. a bill with cleaning items and
// food on it) that add up to exactly its amount. The lines keep the
// original's date, type, vendor, payment method, receipt, attachment, notes
// and creator, and share a split_group_id. The original row is deleted, in
// the same DB transaction as the inserts. Splitting a line again keeps it in
// the same group, so the group still sums to the first original's amount.
export const splitTransaction = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.number().int().positive(),
      lines: z
        .array(
          z.object({
            category: z.string().trim().min(1).max(100),
            amount: z.number().positive(),
            description: optText(),
          }),
        )
        .min(MIN_SPLIT_LINES)
        .max(MAX_SPLIT_LINES),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const original = (
      await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, data.id))
        .limit(1)
    ).at(0)
    if (!original) throw new Error('Transaction not found')
    await assertDatesUnlocked(original.date)

    const type = original.type as TransactionType
    // Lines must use current categories, even if the original's is retired.
    for (const line of data.lines) assertCategory({ type, ...line })
    if (
      !splitAddsUp(
        original.amount,
        data.lines.map((l) => l.amount),
      )
    ) {
      throw new Error(
        'The lines must add up exactly to the original amount, with each line more than zero.',
      )
    }

    const splitGroupId = original.splitGroupId ?? crypto.randomUUID()
    const { id: _id, updatedAt: _updatedAt, ...carried } = original
    const inserted = await db.transaction(async (tx) => {
      const removed = await tx
        .delete(transactions)
        .where(eq(transactions.id, original.id))
        .returning({ id: transactions.id })
      // Someone else deleted or split it in the meantime.
      if (removed.length !== 1) throw new Error('Transaction not found')
      return tx
        .insert(transactions)
        .values(
          data.lines.map((line) => ({
            ...carried,
            category: line.category,
            amount: line.amount,
            description: line.description?.trim() || null,
            splitGroupId,
          })),
        )
        .returning({ id: transactions.id })
    })
    return { splitGroupId, ids: inserted.map((r) => r.id) }
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

export interface TransactionCategoryTotal {
  month: string // YYYY-MM
  type: TransactionType
  category: string
  amount: number
}

// Manual transaction totals per month, type and category, for the
// dashboard's category donut (the client picks the month range). Fee
// payments and salaries aren't transactions, so they're not in here.
export const getTransactionCategoryTotals = createServerFn({
  method: 'GET',
}).handler(async (): Promise<TransactionCategoryTotal[]> => {
  await requireRole(['admin'])
  const rows = await db
    .select({
      month: sql<string>`substr(${transactions.date}, 1, 7)`,
      type: transactions.type,
      category: transactions.category,
      amount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .groupBy(
      sql`substr(${transactions.date}, 1, 7)`,
      transactions.type,
      transactions.category,
    )
  return rows.map((r) => ({
    month: r.month,
    type: r.type as TransactionType,
    category: r.category,
    amount: Number(r.amount) || 0,
  }))
})

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

    // Each payment counts in the month it was received. (Previously this used
    // the fee's cached latest-payment date, which put a fee's whole paid
    // total into the month of its last instalment.)
    const feeRows = await db
      .select({
        month: sql<string>`substr(${feePayments.paidDate}, 1, 7)`,
        collected: sql<number>`COALESCE(SUM(${feePayments.amount}), 0)`,
      })
      .from(feePayments)
      .groupBy(sql`substr(${feePayments.paidDate}, 1, 7)`)

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
