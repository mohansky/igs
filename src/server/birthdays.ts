import { createServerFn } from '@tanstack/react-start'
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '#/db'
import { staffProfiles, studentProfiles } from '#/db/schema'
import { requireRole } from './auth-utils'

export interface Birthday {
  id: string
  name: string
  dateOfBirth: string // YYYY-MM-DD
  role: 'student' | 'staff'
}

// Admin/staff only — a shared calendar of every student's birthday isn't
// something parent/student logins should see.
export const listBirthdays = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Birthday[]> => {
    await requireRole(['admin', 'staff'])

    const students = await db
      .select({
        id: studentProfiles.id,
        name: studentProfiles.studentName,
        dateOfBirth: studentProfiles.dateOfBirth,
      })
      .from(studentProfiles)
      .where(
        and(
          eq(studentProfiles.isActive, true),
          isNotNull(studentProfiles.dateOfBirth),
        ),
      )

    const staff = await db
      .select({
        id: staffProfiles.id,
        name: staffProfiles.staffName,
        dateOfBirth: staffProfiles.dateOfBirth,
      })
      .from(staffProfiles)
      .where(
        and(
          eq(staffProfiles.isActive, true),
          isNotNull(staffProfiles.dateOfBirth),
        ),
      )

    return [
      ...students.map((s) => ({
        id: `student-${s.id}`,
        name: s.name,
        dateOfBirth: s.dateOfBirth!,
        role: 'student' as const,
      })),
      ...staff.map((s) => ({
        id: `staff-${s.id}`,
        name: s.name,
        dateOfBirth: s.dateOfBirth!,
        role: 'staff' as const,
      })),
    ]
  },
)
