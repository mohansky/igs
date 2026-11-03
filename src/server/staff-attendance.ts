import { createServerFn } from '@tanstack/react-start'
import { and, count, eq, gte, lte } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '#/db'
import { staffAttendance, staffProfiles, user } from '#/db/schema'

// Who last saved a record. The marker saves the whole roster at once, so
// this is "last saved by" for the day.
const markedBy = alias(user, 'marked_by')
import { requireRole } from './auth-utils'
import { currentFyStartYear } from '#/lib/financial-year'
import { LEAVE_TYPES, leavePolicyFor } from '#/lib/leave-policy'
import type { LeavePolicy } from '#/lib/leave-policy'
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
            leaveType: z.enum(LEAVE_TYPES).optional(),
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
      // A leave type only means something on a leave day; clear it otherwise
      // so switching a day from leave to present gives the day back.
      const leaveType =
        record.status === 'leave' ? (record.leaveType ?? null) : null
      await db
        .insert(staffAttendance)
        .values({
          userId: record.userId,
          date: data.date,
          status: record.status,
          leaveType,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          notes: record.notes,
          markedByUserId: session.user.id,
        })
        .onConflictDoUpdate({
          target: [staffAttendance.userId, staffAttendance.date],
          set: {
            status: record.status,
            leaveType,
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

    const records = (
      await db
        .select({ record: staffAttendance, markedByName: markedBy.name })
        .from(staffAttendance)
        .leftJoin(markedBy, eq(markedBy.id, staffAttendance.markedByUserId))
        .where(eq(staffAttendance.date, data.date))
    ).map((r) => ({ ...r.record, markedByName: r.markedByName }))

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
        leaveType: staffAttendance.leaveType,
        checkIn: staffAttendance.checkIn,
        checkOut: staffAttendance.checkOut,
        notes: staffAttendance.notes,
        userId: staffAttendance.userId,
        staffName: user.name,
        staffEmail: user.email,
        markedByName: markedBy.name,
        markedAt: staffAttendance.updatedAt,
      })
      .from(staffAttendance)
      .leftJoin(user, eq(staffAttendance.userId, user.id))
      .leftJoin(markedBy, eq(markedBy.id, staffAttendance.markedByUserId))

    const result =
      conditions.length > 0
        ? await baseQuery.where(and(...conditions))
        : await baseQuery

    return result
  })

// ── Leave balances ──────────────────────────────────────────

export interface LeaveUsed {
  userId: string
  casual: number
  sick: number
  // Leave days with no type recorded — marked before types existed, or
  // without picking one. Shown so they can be classified.
  unspecified: number
}

export interface LeaveBalances {
  policy: LeavePolicy | null
  used: LeaveUsed[]
}

// Leave taken per staff member in one school year, counted from the policy
// window. Admin/auditor see everyone (or one userId); staff only themselves.
export const getLeaveBalances = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      year: z.number().int().min(2000).max(2100).optional(),
      userId: z.string().min(1).optional(),
    }),
  )
  .handler(async ({ data }): Promise<LeaveBalances> => {
    const session = await requireRole(['admin', 'staff'])
    const role = (session.user as { role?: string }).role ?? 'staff'
    const canSeeAll = role === 'admin' || role === 'auditor'
    const userId = canSeeAll ? data.userId : session.user.id

    const policy = leavePolicyFor(data.year ?? currentFyStartYear())
    if (!policy) return { policy: null, used: [] }

    const conditions = [
      eq(staffAttendance.status, 'leave'),
      gte(staffAttendance.date, policy.from),
      lte(staffAttendance.date, policy.to),
    ]
    if (userId) conditions.push(eq(staffAttendance.userId, userId))

    const rows = await db
      .select({
        userId: staffAttendance.userId,
        leaveType: staffAttendance.leaveType,
        days: count(),
      })
      .from(staffAttendance)
      .where(and(...conditions))
      .groupBy(staffAttendance.userId, staffAttendance.leaveType)

    const byUser = new Map<string, LeaveUsed>()
    for (const row of rows) {
      const entry = byUser.get(row.userId) ?? {
        userId: row.userId,
        casual: 0,
        sick: 0,
        unspecified: 0,
      }
      if (row.leaveType === 'casual') entry.casual += row.days
      else if (row.leaveType === 'sick') entry.sick += row.days
      else entry.unspecified += row.days
      byUser.set(row.userId, entry)
    }
    return { policy, used: [...byUser.values()] }
  })
