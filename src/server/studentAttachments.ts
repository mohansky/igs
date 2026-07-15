import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { studentAttachments } from '#/db/schema'
import { requireRole } from './auth-utils'
import { z } from 'zod'

export type AttachmentType = 'file' | 'link'

export const listStudentAttachments = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ studentProfileId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    return db
      .select()
      .from(studentAttachments)
      .where(eq(studentAttachments.studentProfileId, data.studentProfileId))
      .orderBy(studentAttachments.createdAt)
  })

export const addStudentAttachment = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      studentProfileId: z.number().int().positive(),
      title: z.string().trim().min(1).max(300),
      description: z.string().max(2000).nullish(),
      attachmentUrl: z.string().min(1).max(1000),
      attachmentType: z.enum(['file', 'link']),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const result = await db.insert(studentAttachments).values(data).returning()
    return result[0]
  })

export const deleteStudentAttachment = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    await db
      .delete(studentAttachments)
      .where(eq(studentAttachments.id, data.id))
    return { success: true }
  })
