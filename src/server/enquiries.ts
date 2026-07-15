import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { enquiries } from '#/db/schema'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireRole } from './auth-utils'

export const enquiryStatus = z.enum([
  'new',
  'visit-scheduled',
  'visited',
  'applied',
  'closed',
])

export type EnquiryStatus = z.infer<typeof enquiryStatus>

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

// `source` is free-form in practice (real rows contain e.g. "Google"), so it's
// bounded rather than enumerated.
const enquiryFields = {
  childName: z.string().trim().min(1).max(200),
  childDob: dateString.nullish(),
  parentName: z.string().trim().min(1).max(200),
  parentOccupation: z.string().max(200).nullish(),
  parentPhone: z.string().trim().min(1).max(30),
  parentEmail: z.email().max(320).nullish(),
  address: z.string().max(1000).nullish(),
  enquiryDate: dateString,
  source: z.string().max(100).nullish(),
  visitDate: dateString.nullish(),
  visitTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Expected HH:mm')
    .nullish(),
  notes: z.string().max(2000).nullish(),
}

export type Enquiry = typeof enquiries.$inferSelect

// ── List all enquiries (admin/staff) ─────────────────────────

export const listEnquiries = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin', 'staff'])
    return db.select().from(enquiries).orderBy(desc(enquiries.createdAt))
  },
)

// ── Create enquiry ────────────────────────────────────────────

export const createEnquiry = createServerFn({ method: 'POST' })
  .inputValidator(z.object(enquiryFields))
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const [row] = await db.insert(enquiries).values(data).returning()
    return row
  })

// ── Update enquiry ────────────────────────────────────────────

export const updateEnquiry = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.number().int().positive(),
      updates: z
        .object({
          ...enquiryFields,
          status: enquiryStatus,
          assignedToUserId: z.string().nullish(),
        })
        .partial(),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const [row] = await db
      .update(enquiries)
      .set({ ...data.updates, updatedAt: new Date() })
      .where(eq(enquiries.id, data.id))
      .returning()
    return row
  })

// ── Delete enquiry ────────────────────────────────────────────

export const deleteEnquiry = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await db.delete(enquiries).where(eq(enquiries.id, data.id))
    return { success: true }
  })
