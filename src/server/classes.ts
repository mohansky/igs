import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { classes } from '#/db/schema'
import { requireAuth, requireRole } from './auth-utils'
import { z } from 'zod'

const classFields = {
  name: z.string().trim().min(1).max(100),
  section: z.string().max(50).nullish(),
  academicYear: z.string().regex(/^\d{4}(-\d{2,4})?$/, 'Expected e.g. 2025-26'),
  capacity: z.number().int().positive().max(1000).nullish(),
  teacherUserId: z.string().nullish(),
}

export const listClasses = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAuth()
    const result = await db
      .select()
      .from(classes)
      .where(eq(classes.isActive, true))
    return result
  },
)

export const createClass = createServerFn({ method: 'POST' })
  .inputValidator(z.object(classFields))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const result = await db.insert(classes).values(data).returning()
    return result[0]
  })

export const updateClass = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.number().int().positive(),
      updates: z.object(classFields).partial(),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const result = await db
      .update(classes)
      .set({ ...data.updates, updatedAt: new Date() })
      .where(eq(classes.id, data.id))
      .returning()
    return result[0]
  })

export const deleteClass = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await db
      .update(classes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(classes.id, data.id))
    return { success: true }
  })
