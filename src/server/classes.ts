import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { classes } from '#/db/schema'
import { requireRole } from './auth-utils'

export const listClasses = createServerFn({ method: 'GET' }).handler(
  async () => {
    const result = await db
      .select()
      .from(classes)
      .where(eq(classes.isActive, true))
    return result
  },
)

export const createClass = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      name: string
      section?: string | null
      academicYear: string
      capacity?: number | null
      teacherUserId?: string | null
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const result = await db.insert(classes).values(data).returning()
    return result[0]
  })

export const updateClass = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: number
      updates: {
        name?: string
        section?: string | null
        academicYear?: string
        capacity?: number | null
        teacherUserId?: string | null
      }
    }) => data,
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
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await db
      .update(classes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(classes.id, data.id))
    return { success: true }
  })
