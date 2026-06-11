import { createServerFn } from '@tanstack/react-start'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '#/db'
import {
  attendance,
  effectiveClassId,
  studentProfiles,
  studentParents,
} from '#/db/schema'
import { getSession } from './auth'
import { requireRole } from './auth-utils'

export const markAttendance = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      date: string
      records: { studentUserId: string; status: string; notes?: string }[]
    }) => data,
  )
  .handler(async ({ data }) => {
    const session = await requireRole(['admin', 'staff'])
    const markedByUserId = session.user.id

    for (const record of data.records) {
      await db
        .insert(attendance)
        .values({
          studentUserId: record.studentUserId,
          date: data.date,
          status: record.status,
          notes: record.notes,
          markedByUserId,
        })
        .onConflictDoUpdate({
          target: [attendance.studentUserId, attendance.date],
          set: {
            status: record.status,
            notes: record.notes,
            markedByUserId,
            updatedAt: new Date(),
          },
        })
    }

    return { success: true }
  })

export const getAttendanceByDate = createServerFn({ method: 'GET' })
  .inputValidator((data: { date: string; classId?: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])

    const students = data.classId
      ? await db
          .select()
          .from(studentProfiles)
          .where(
            and(
              sql`${effectiveClassId} = ${data.classId}`,
              eq(studentProfiles.isActive, true),
            ),
          )
      : []

    const allRecords = await db
      .select()
      .from(attendance)
      .where(eq(attendance.date, data.date))

    const studentProfileIds = students.map((s) => String(s.id))
    const records = data.classId
      ? allRecords.filter((r) => studentProfileIds.includes(r.studentUserId))
      : allRecords

    return { students, records }
  })

export const listAttendance = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { classId?: number; startDate?: string; endDate?: string }) => data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])

    const conditions = []
    if (data.startDate) {
      conditions.push(gte(attendance.date, data.startDate))
    }
    if (data.endDate) {
      conditions.push(lte(attendance.date, data.endDate))
    }

    const baseQuery = db
      .select({
        id: attendance.id,
        date: attendance.date,
        status: attendance.status,
        notes: attendance.notes,
        studentUserId: attendance.studentUserId,
        studentName: studentProfiles.studentName,
        admissionNumber: studentProfiles.admissionNumber,
        classId: sql<number | null>`${effectiveClassId}`,
      })
      .from(attendance)
      .leftJoin(
        studentProfiles,
        eq(attendance.studentUserId, studentProfiles.id),
      )

    if (data.classId) {
      conditions.push(sql`${effectiveClassId} = ${data.classId}`)
    }

    const result =
      conditions.length > 0
        ? await baseQuery.where(and(...conditions))
        : await baseQuery

    return result
  })

export const getStudentAttendance = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      studentProfileId?: number
      startDate?: string
      endDate?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) throw new Error('Unauthorized')

    const userRole = (session.user as { role?: string }).role ?? 'student'
    const isStaffOrAdmin = userRole === 'admin' || userRole === 'staff'

    // If a specific student profile ID is given, verify access
    let studentUserId = session.user.id
    if (data.studentProfileId) {
      const [profile] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, data.studentProfileId))
        .limit(1)
      if (!profile) throw new Error('Forbidden')

      // Staff/admin can view any student; others must own or be a linked parent
      if (!isStaffOrAdmin && profile.userId !== session.user.id) {
        const parentLink = await db
          .select()
          .from(studentParents)
          .where(
            and(
              eq(studentParents.studentProfileId, data.studentProfileId!),
              eq(studentParents.parentUserId, session.user.id),
            ),
          )
          .limit(1)
        if (parentLink.length === 0) throw new Error('Forbidden')
      }
      studentUserId = String(profile.id)
    }

    const conditions = [eq(attendance.studentUserId, studentUserId)]

    if (data.startDate) {
      conditions.push(gte(attendance.date, data.startDate))
    }
    if (data.endDate) {
      conditions.push(lte(attendance.date, data.endDate))
    }

    const records = await db
      .select()
      .from(attendance)
      .where(and(...conditions))

    return records
  })
