import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { studentAttachments } from '#/db/schema'
import { requireRole } from './auth-utils'

export const listStudentAttachments = createServerFn({ method: 'GET' })
  .inputValidator((data: { studentProfileId: number }) => data)
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
    (data: {
      studentProfileId: number
      title: string
      description?: string | null
      attachmentUrl: string
      attachmentType: string
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const result = await db.insert(studentAttachments).values(data).returning()
    return result[0]
  })

export const deleteStudentAttachment = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    await db
      .delete(studentAttachments)
      .where(eq(studentAttachments.id, data.id))
    return { success: true }
  })
