import { createServerFn } from '@tanstack/react-start'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '#/db'
import { staffAttendance, user } from '#/db/schema'
import { requireRole } from './auth-utils'

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
    (data: {
      date: string
      records: {
        userId: string
        status: string
        checkIn?: string
        checkOut?: string
        notes?: string
      }[]
    }) => data,
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
  .inputValidator((data: { date: string }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])

    const staff = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.role, 'staff'))

    const records = await db
      .select()
      .from(staffAttendance)
      .where(eq(staffAttendance.date, data.date))

    return { staff, records }
  })

export const listStaffAttendance = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      userId?: string
      startDate?: string
      endDate?: string
    }) => data,
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
