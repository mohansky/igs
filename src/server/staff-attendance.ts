import { createServerFn } from '@tanstack/react-start'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '#/db'
import { staffAttendance, staffProfiles, user } from '#/db/schema'
import { requireRole } from './auth-utils'
import { z } from 'zod'

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
const timeString = z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:mm')

// Real rows contain present/absent; the schema also allows late/leave.
const staffAttendanceStatus = z.enum(['present', 'absent', 'late', 'leave'])

export type StaffAttendanceStatus = z.infer<typeof staffAttendanceStatus>

export const listStaffMembers = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin'])
    const staff = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.role, 'staff'))
    return staff
  },
)

export const markStaffAttendance = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      date: dateString,
      records: z
        .array(
          z.object({
            userId: z.string().min(1),
            status: staffAttendanceStatus,
            checkIn: timeString.optional(),
            checkOut: timeString.optional(),
            notes: z.string().max(1000).optional(),
          }),
        )
        .min(1)
        .max(500),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireRole(['admin'])

    for (const record of data.records) {
      await db
        .insert(staffAttendance)
        .values({
          userId: record.userId,
          date: data.date,
          status: record.status,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          notes: record.notes,
          markedByUserId: session.user.id,
        })
        .onConflictDoUpdate({
          target: [staffAttendance.userId, staffAttendance.date],
          set: {
            status: record.status,
            checkIn: record.checkIn,
            checkOut: record.checkOut,
            notes: record.notes,
            markedByUserId: session.user.id,
            updatedAt: new Date(),
          },
        })
    }

    return { success: true }
  })

export const getStaffAttendanceByDate = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])

    const staff = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        defaultCheckIn: staffProfiles.defaultCheckIn,
        defaultCheckOut: staffProfiles.defaultCheckOut,
      })
      .from(user)
      .leftJoin(staffProfiles, eq(staffProfiles.userId, user.id))
      .where(eq(user.role, 'staff'))

    const records = await db
      .select()
      .from(staffAttendance)
      .where(eq(staffAttendance.date, data.date))

    return { staff, records }
  })

export const listStaffAttendance = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      userId: z.string().optional(),
      startDate: dateString.optional(),
      endDate: dateString.optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])

    const conditions = []
    if (data.userId) {
      conditions.push(eq(staffAttendance.userId, data.userId))
    }
    if (data.startDate) {
      conditions.push(gte(staffAttendance.date, data.startDate))
    }
    if (data.endDate) {
      conditions.push(lte(staffAttendance.date, data.endDate))
    }

    const baseQuery = db
      .select({
        id: staffAttendance.id,
        date: staffAttendance.date,
        status: staffAttendance.status,
        checkIn: staffAttendance.checkIn,
        checkOut: staffAttendance.checkOut,
        notes: staffAttendance.notes,
        userId: staffAttendance.userId,
        staffName: user.name,
        staffEmail: user.email,
      })
      .from(staffAttendance)
      .leftJoin(user, eq(staffAttendance.userId, user.id))

    const result =
      conditions.length > 0
        ? await baseQuery.where(and(...conditions))
        : await baseQuery

    return result
  })
