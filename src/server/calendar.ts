import { createServerFn } from '@tanstack/react-start'
import { and, eq, gte, lte, or } from 'drizzle-orm'
import { db } from '#/db'
import { calendarEvents } from '#/db/schema'
import { requireRole } from './auth-utils'
import { getSession } from './auth'

export const listCalendarEvents = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { startDate?: string; endDate?: string; type?: string }) => data,
  )
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) throw new Error('Unauthorized')

    const conditions = []
    if (data.startDate && data.endDate) {
      // Events that overlap with the requested range
      conditions.push(
        or(
          and(
            gte(calendarEvents.startDate, data.startDate),
            lte(calendarEvents.startDate, data.endDate),
          ),
          and(
            gte(calendarEvents.endDate, data.startDate),
            lte(calendarEvents.endDate, data.endDate),
          ),
          and(
            lte(calendarEvents.startDate, data.startDate),
            gte(calendarEvents.endDate, data.endDate),
          ),
        ),
      )
    }
    if (data.type) {
      conditions.push(eq(calendarEvents.type, data.type))
    }

    const result =
      conditions.length > 0
        ? await db
            .select()
            .from(calendarEvents)
            .where(and(...conditions))
        : await db.select().from(calendarEvents)

    return result
  })

export const createCalendarEvent = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      title: string
      description?: string
      startDate: string
      endDate?: string
      type: string
      color?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const session = await requireRole(['admin', 'staff'])
    const result = await db
      .insert(calendarEvents)
      .values({
        ...data,
        createdByUserId: session.user.id,
      })
      .returning()
    return result[0]
  })

export const updateCalendarEvent = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: number
      title?: string
      description?: string
      startDate?: string
      endDate?: string | null
      type?: string
      color?: string | null
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const { id, ...updates } = data
    const result = await db
      .update(calendarEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(calendarEvents.id, id))
      .returning()
    return result[0]
  })

export const deleteCalendarEvent = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    await db.delete(calendarEvents).where(eq(calendarEvents.id, data.id))
    return { success: true }
  })
