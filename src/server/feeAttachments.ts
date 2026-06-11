import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { feeAttachments } from '#/db/schema'
import { requireRole } from './auth-utils'

export const listFeeAttachments = createServerFn({ method: 'GET' })
  .inputValidator((data: { feeId: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    return db
      .select()
      .from(feeAttachments)
      .where(eq(feeAttachments.feeId, data.feeId))
      .orderBy(feeAttachments.createdAt)
  })

export const addFeeAttachment = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      feeId: number
      feePaymentId?: number | null
      title: string
      description?: string | null
      attachmentUrl: string
      attachmentType: string
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const result = await db.insert(feeAttachments).values(data).returning()
    return result[0]
  })

export const deleteFeeAttachment = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    await db.delete(feeAttachments).where(eq(feeAttachments.id, data.id))
    return { success: true }
  })
