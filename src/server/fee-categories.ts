import { createServerFn } from '@tanstack/react-start'
import {
  and,
  asc,
  count,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  sql,
} from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { feeCategories, fees, studentProfiles } from '#/db/schema'
import {
  academicYearLabel,
  fyEndDate,
  fyStartDate,
  fyStartYearOf,
} from '#/lib/financial-year'
import { TUITION_KEY, UNCATEGORISED_LABEL } from '#/lib/fee-categories'
import { requireRole } from './auth-utils'

// Category management and reports are admin-only (GETs also open to the
// read-only auditor via requireRole).

type Db = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

// The Tuition category's id, found by key (not name) so renames are safe.
export async function getTuitionCategoryId(tx: Db = db): Promise<number> {
  const [row] = await tx
    .select({ id: feeCategories.id })
    .from(feeCategories)
    .where(eq(feeCategories.key, TUITION_KEY))
    .limit(1)
  if (!row) {
    throw new Error(
      'Fee categories are not set up yet. Run `pnpm db:seed:categories`.',
    )
  }
  return row.id
}

// A category new fees may use: it must exist and be active.
export async function assertActiveCategory(categoryId: number, tx: Db = db) {
  const [row] = await tx
    .select({ isActive: feeCategories.isActive })
    .from(feeCategories)
    .where(eq(feeCategories.id, categoryId))
    .limit(1)
  if (!row) throw new Error('Fee category not found.')
  if (!row.isActive) throw new Error('That fee category is no longer active.')
}

// All categories (active and inactive), in display order, with how many fees
// use each — the admin page needs both; dropdowns filter to active ones.
export const listFeeCategories = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin'])
    const usage = await db
      .select({ categoryId: fees.categoryId, n: count() })
      .from(fees)
      .groupBy(fees.categoryId)
    const used = new Map(usage.map((u) => [u.categoryId, u.n]))
    const rows = await db
      .select()
      .from(feeCategories)
      .orderBy(asc(feeCategories.sortOrder), asc(feeCategories.id))
    return rows.map((c) => ({ ...c, feeCount: used.get(c.id) ?? 0 }))
  },
)

const categoryName = z.string().trim().min(1).max(100)

export const createFeeCategory = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({ name: categoryName, isPassThrough: z.boolean().default(false) }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const [{ next }] = await db
      .select({
        next: sql<number>`COALESCE(MAX(${feeCategories.sortOrder}), -1) + 1`,
      })
      .from(feeCategories)
    const [row] = await db
      .insert(feeCategories)
      .values({
        name: data.name,
        isPassThrough: data.isPassThrough,
        sortOrder: next,
      })
      .returning()
    return row
  })

export const updateFeeCategory = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.number().int().positive(),
      name: categoryName.optional(),
      isPassThrough: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const { id, ...updates } = data
    const [existing] = await db
      .select({ key: feeCategories.key })
      .from(feeCategories)
      .where(eq(feeCategories.id, id))
      .limit(1)
    if (!existing) throw new Error('Fee category not found.')
    if (existing.key === TUITION_KEY && updates.isActive === false) {
      throw new Error(
        'Tuition Fee is used by bulk fees and concessions and cannot be deactivated.',
      )
    }
    const [row] = await db
      .update(feeCategories)
      .set(updates)
      .where(eq(feeCategories.id, id))
      .returning()
    return row
  })

// Save the full display order: ids in the order they should appear.
export const saveFeeCategoryOrder = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({ ids: z.array(z.number().int().positive()).max(200) }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    if (data.ids.length === 0) return { success: true }
    const statements = data.ids.map((id, i) =>
      db
        .update(feeCategories)
        .set({ sortOrder: i })
        .where(eq(feeCategories.id, id)),
    )
    await db.batch(statements as [(typeof statements)[number]])
    return { success: true }
  })

// Hard delete only when no fee uses the category; otherwise deactivate it.
export const deleteFeeCategory = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const [existing] = await db
      .select({ key: feeCategories.key })
      .from(feeCategories)
      .where(eq(feeCategories.id, data.id))
      .limit(1)
    if (!existing) throw new Error('Fee category not found.')
    if (existing.key === TUITION_KEY) {
      throw new Error('Tuition Fee cannot be deleted.')
    }
    const [{ n }] = await db
      .select({ n: count() })
      .from(fees)
      .where(eq(fees.categoryId, data.id))
    if (n > 0) {
      throw new Error(
        `${n} fee${n === 1 ? '' : 's'} use this category. Deactivate it instead.`,
      )
    }
    await db.delete(feeCategories).where(eq(feeCategories.id, data.id))
    return { success: true }
  })

// ── Backfill helper ─────────────────────────────────────────

// Fees with no category (created before categories existed).
export const listUncategorisedFees = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin'])
    return db
      .select({
        id: fees.id,
        description: fees.description,
        amount: fees.amount,
        dueDate: fees.dueDate,
        isOpen: fees.isOpen,
        studentName: studentProfiles.studentName,
      })
      .from(fees)
      .leftJoin(studentProfiles, eq(fees.studentUserId, studentProfiles.id))
      .where(isNull(fees.categoryId))
      .orderBy(asc(fees.dueDate), asc(fees.id))
  },
)

// Apply a category to uncategorised fees the admin has confirmed. Only ever
// fills an empty category_id; amounts, descriptions and payments untouched.
export const assignFeeCategory = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      feeIds: z.array(z.number().int().positive()).min(1).max(1000),
      categoryId: z.number().int().positive(),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await assertActiveCategory(data.categoryId)
    // Concession (open) fees are tuition by definition.
    if (data.categoryId !== (await getTuitionCategoryId())) {
      const [{ n }] = await db
        .select({ n: count() })
        .from(fees)
        .where(and(inArray(fees.id, data.feeIds), eq(fees.isOpen, true)))
      if (n > 0) {
        throw new Error(
          'Concession (open) fees can only be Tuition Fee. Deselect them and try again.',
        )
      }
    }
    const updated = await db
      .update(fees)
      .set({ categoryId: data.categoryId })
      .where(and(inArray(fees.id, data.feeIds), isNull(fees.categoryId)))
      .returning({ id: fees.id })
    return { updated: updated.length }
  })

// ── Summary by category ─────────────────────────────────────

const academicYear = z.string().regex(/^\d{4}-\d{2}$/, 'Expected e.g. 2026-27')

// Per school year (by due date): billed, received and pending per category,
// plus an Uncategorised row. Billed and pending leave out concession (open)
// fees, which have nothing due; received includes everything paid against
// that year's fees.
export const getFeeCategorySummary = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ academicYear: academicYear.optional() }))
  .handler(async ({ data }) => {
    await requireRole(['admin'])

    const dates = await db.selectDistinct({ d: fees.dueDate }).from(fees)
    const years = [
      ...new Set(dates.map((r) => academicYearLabel(fyStartYearOf(r.d)))),
    ].sort((a, b) => b.localeCompare(a))

    const year = data.academicYear ?? years[0]
    if (!year) return { academicYear: null, years, rows: [] }
    const startYear = Number(year.slice(0, 4))

    const totals = await db
      .select({
        categoryId: fees.categoryId,
        billed: sql<number>`COALESCE(SUM(CASE WHEN ${fees.isOpen} = 0 THEN ${fees.amount} ELSE 0 END), 0)`,
        received: sql<number>`COALESCE(SUM(COALESCE(${fees.paidAmount}, 0)), 0)`,
        pending: sql<number>`COALESCE(SUM(CASE WHEN ${fees.isOpen} = 0 AND ${fees.amount} > COALESCE(${fees.paidAmount}, 0) THEN ${fees.amount} - COALESCE(${fees.paidAmount}, 0) ELSE 0 END), 0)`,
        feeCount: count(),
      })
      .from(fees)
      .where(
        and(
          gte(fees.dueDate, fyStartDate(startYear)),
          lte(fees.dueDate, fyEndDate(startYear)),
        ),
      )
      .groupBy(fees.categoryId)

    const categories = await db
      .select()
      .from(feeCategories)
      .orderBy(asc(feeCategories.sortOrder), asc(feeCategories.id))
    const byId = new Map(totals.map((t) => [t.categoryId, t]))

    const rows: FeeCategorySummaryRow[] = categories
      .filter((c) => byId.has(c.id))
      .map((c) => ({
        categoryId: c.id,
        name: c.name,
        isPassThrough: c.isPassThrough,
        ...amounts(byId.get(c.id)!),
      }))
    const uncategorised = byId.get(null)
    if (uncategorised) {
      // Old fees: counted with fee income in the subtotals (not pass-through).
      rows.push({
        categoryId: null,
        name: UNCATEGORISED_LABEL,
        isPassThrough: false,
        ...amounts(uncategorised),
      })
    }
    return { academicYear: year, years, rows }
  })

export interface FeeCategorySummaryRow {
  categoryId: number | null
  name: string
  isPassThrough: boolean
  billed: number
  received: number
  pending: number
  feeCount: number
}

function amounts(t: {
  billed: number
  received: number
  pending: number
  feeCount: number
}) {
  return {
    billed: Number(t.billed) || 0,
    received: Number(t.received) || 0,
    pending: Number(t.pending) || 0,
    feeCount: t.feeCount,
  }
}
