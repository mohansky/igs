import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { feeAttachments } from '#/db/schema'
import { requireRole } from './auth-utils'
import { z } from 'zod'

export const listFeeAttachments = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ feeId: z.number().int().positive() }))
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
    z.object({
      feeId: z.number().int().positive(),
      feePaymentId: z.number().int().positive().nullish(),
      title: z.string().trim().min(1).max(300),
      description: z.string().max(2000).nullish(),
      attachmentUrl: z.string().min(1).max(1000),
      attachmentType: z.enum(['file', 'link']),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const result = await db.insert(feeAttachments).values(data).returning()
    return result[0]
  })

export const deleteFeeAttachment = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    await db.delete(feeAttachments).where(eq(feeAttachments.id, data.id))
    return { success: true }
  })
