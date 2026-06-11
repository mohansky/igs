import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { staffAttachments } from '#/db/schema'
import { requireRole } from './auth-utils'

export const listStaffAttachments = createServerFn({ method: 'GET' })
  .inputValidator((data: { staffProfileId: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    return db
      .select()
      .from(staffAttachments)
      .where(eq(staffAttachments.staffProfileId, data.staffProfileId))
      .orderBy(staffAttachments.createdAt)
  })

export const addStaffAttachment = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      staffProfileId: number
      title: string
      description?: string | null
      attachmentUrl: string
      attachmentType: string
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const result = await db.insert(staffAttachments).values(data).returning()
    return result[0]
  })

export const deleteStaffAttachment = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await db.delete(staffAttachments).where(eq(staffAttachments.id, data.id))
    return { success: true }
  })
