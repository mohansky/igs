import { createServerFn } from '@tanstack/react-start'
import { and, eq, gte, lte, or } from 'drizzle-orm'
import { db } from '#/db'
import { calendarEvents } from '#/db/schema'
import { requireRole } from './auth-utils'
import { getSession } from './auth'
import { z } from 'zod'

// Matches the values already in calendar_events (event/exam/holiday/meeting)
// plus 'deadline' from the schema comment.
export const calendarType = z.enum([
  'event',
  'holiday',
  'exam',
  'meeting',
  'deadline',
])

export type CalendarEventType = z.infer<typeof calendarType>

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

export const listCalendarEvents = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      startDate: dateString.optional(),
      endDate: dateString.optional(),
      type: calendarType.optional(),
    }),
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
    z.object({
      title: z.string().trim().min(1).max(300),
      description: z.string().max(2000).optional(),
      startDate: dateString,
      endDate: dateString.optional(),
      type: calendarType,
      color: z.string().max(50).optional(),
    }),
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
    z.object({
      id: z.number().int().positive(),
      title: z.string().trim().min(1).max(300).optional(),
      description: z.string().max(2000).optional(),
      startDate: dateString.optional(),
      endDate: dateString.nullish(),
      type: calendarType.optional(),
      color: z.string().max(50).nullish(),
    }),
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
  .inputValidator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    await db.delete(calendarEvents).where(eq(calendarEvents.id, data.id))
    return { success: true }
  })
