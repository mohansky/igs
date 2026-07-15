import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { staffAttachments } from '#/db/schema'
import { requireRole } from './auth-utils'
import { z } from 'zod'

export const listStaffAttachments = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ staffProfileId: z.number().int().positive() }))
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
    z.object({
      staffProfileId: z.number().int().positive(),
      title: z.string().trim().min(1).max(300),
      description: z.string().max(2000).nullish(),
      attachmentUrl: z.string().min(1).max(1000),
      attachmentType: z.enum(['file', 'link']),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const result = await db.insert(staffAttachments).values(data).returning()
    return result[0]
  })

export const deleteStaffAttachment = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await db.delete(staffAttachments).where(eq(staffAttachments.id, data.id))
    return { success: true }
  })
