import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db'
import { enquiries } from '#/db/schema'
import { desc, eq } from 'drizzle-orm'
import { requireRole } from './auth-utils'

export type EnquiryStatus =
  | 'new'
  | 'visit-scheduled'
  | 'visited'
  | 'applied'
  | 'closed'

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
  .inputValidator(
    (data: {
      childName: string
      childDob?: string | null
      parentName: string
      parentOccupation?: string | null
      parentPhone: string
      parentEmail?: string | null
      address?: string | null
      enquiryDate: string
      source?: string | null
      visitDate?: string | null
      visitTime?: string | null
      notes?: string | null
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const [row] = await db.insert(enquiries).values(data).returning()
    return row
  })

// ── Update enquiry ────────────────────────────────────────────

export const updateEnquiry = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: number
      updates: Partial<{
        childName: string
        childDob: string | null
        parentName: string
        parentOccupation: string | null
        parentPhone: string
        parentEmail: string | null
        address: string | null
        enquiryDate: string
        source: string | null
        visitDate: string | null
        visitTime: string | null
        status: EnquiryStatus
        notes: string | null
        assignedToUserId: string | null
      }>
    }) => data,
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
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await db.delete(enquiries).where(eq(enquiries.id, data.id))
    return { success: true }
  })
