import { createServerFn } from '@tanstack/react-start'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '#/db'
import { studentProfiles, studentParents, user } from '#/db/schema'
import { requireRole } from './auth-utils'
import { getSession } from './auth'

// ── List all students (admin/staff) ─────────────────────────

export const listStudents = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin', 'staff'])

    const profiles = await db
      .select({
        id: studentProfiles.id,
        studentName: studentProfiles.studentName,
        userId: studentProfiles.userId,
        classId: studentProfiles.classId,
        admissionNumber: studentProfiles.admissionNumber,
        gender: studentProfiles.gender,
        parentPhone: studentProfiles.parentPhone,
        isActive: studentProfiles.isActive,
        userEmail: user.email,
      })
      .from(studentProfiles)
      .leftJoin(user, eq(studentProfiles.userId, user.id))

    // Fetch all parent links with user info
    const allLinks = await db
      .select({
        studentProfileId: studentParents.studentProfileId,
        parentUserId: studentParents.parentUserId,
        relation: studentParents.relation,
        parentName: user.name,
        parentEmail: user.email,
      })
      .from(studentParents)
      .innerJoin(user, eq(studentParents.parentUserId, user.id))

    const parentsByStudent = new Map<
      number,
      {
        parentUserId: string
        parentName: string
        parentEmail: string
        relation: string | null
      }[]
    >()
    for (const link of allLinks) {
      const list = parentsByStudent.get(link.studentProfileId) ?? []
      list.push({
        parentUserId: link.parentUserId,
        parentName: link.parentName,
        parentEmail: link.parentEmail,
        relation: link.relation,
      })
      parentsByStudent.set(link.studentProfileId, list)
    }

    return profiles.map((p) => ({
      ...p,
      parents: parentsByStudent.get(p.id) ?? [],
    }))
  },
)

// ── Toggle student active status ────────────────────────────

export const toggleStudentActive = createServerFn({ method: 'POST' })
  .inputValidator((data: { studentId: number; isActive: boolean }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const result = await db
      .update(studentProfiles)
      .set({ isActive: data.isActive, updatedAt: new Date() })
      .where(eq(studentProfiles.id, data.studentId))
      .returning()
    return result[0]
  })

// ── Delete student ──────────────────────────────────────────

export const deleteStudent = createServerFn({ method: 'POST' })
  .inputValidator((data: { studentId: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await db
      .delete(studentProfiles)
      .where(eq(studentProfiles.id, data.studentId))
    return { success: true }
  })

// ── Get student profile ─────────────────────────────────────

export const getStudentProfile = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { userId?: string; studentId?: number }) => data,
  )
  .handler(async ({ data }) => {
    if (data.studentId) {
      const profile = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, data.studentId))
        .limit(1)
      return profile[0] ?? null
    }
    if (data.userId) {
      const profile = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, data.userId))
        .limit(1)
      return profile[0] ?? null
    }
    return null
  })

// ── Create student profile ──────────────────────────────────

export const createStudentProfile = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      studentName: string
      userId?: string | null
      classId?: number | null
      dateOfBirth?: string | null
      gender?: string | null
      bloodGroup?: string | null
      admissionDate?: string | null
      admissionNumber?: string | null
      photoUrl?: string | null
      parentName?: string | null
      parentRelation?: string | null
      parentPhone?: string | null
      parentEmail?: string | null
      parentOccupation?: string | null
      emergencyContact?: string | null
      emergencyPhone?: string | null
      address?: string | null
      nationality?: string | null
      religion?: string | null
      caste?: string | null
      aadhaarNumber?: string | null
      previousSchool?: string | null
      transferCertificateNumber?: string | null
      transportMode?: string | null
      transportRoute?: string | null
      medicalNotes?: string | null
      allergies?: string | null
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const result = await db.insert(studentProfiles).values(data).returning()
    return result[0]
  })

// ── Update student profile ──────────────────────────────────

export const updateStudentProfile = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      studentId: number
      updates: Record<string, unknown>
    }) => data,
  )
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) throw new Error('Unauthorized')

    const userRole = (session.user as { role?: string }).role ?? 'student'

    // Students/parents can only update their own or their children's profiles
    if (userRole === 'student') {
      const profile = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, data.studentId))
        .limit(1)
      if (!profile[0]) throw new Error('Forbidden')

      // Check if user owns the profile directly
      const isOwner = profile[0].userId === session.user.id

      // Check if user is a linked parent
      const parentLink = await db
        .select()
        .from(studentParents)
        .where(
          and(
            eq(studentParents.studentProfileId, data.studentId),
            eq(studentParents.parentUserId, session.user.id),
          ),
        )
        .limit(1)

      if (!isOwner && parentLink.length === 0) {
        throw new Error('Forbidden')
      }
    } else if (userRole !== 'admin' && userRole !== 'staff') {
      throw new Error('Forbidden')
    }

    const result = await db
      .update(studentProfiles)
      .set({
        ...(data.updates as Partial<typeof studentProfiles.$inferInsert>),
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, data.studentId))
      .returning()
    return result[0]
  })

// ── Get children by parent (via junction table) ─────────────

export const getChildrenByParent = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await getSession()
    if (!session) throw new Error('Unauthorized')

    const links = await db
      .select({
        id: studentProfiles.id,
        studentName: studentProfiles.studentName,
        admissionNumber: studentProfiles.admissionNumber,
        gender: studentProfiles.gender,
        isActive: studentProfiles.isActive,
        classId: studentProfiles.classId,
        relation: studentParents.relation,
      })
      .from(studentParents)
      .innerJoin(
        studentProfiles,
        eq(studentParents.studentProfileId, studentProfiles.id),
      )
      .where(eq(studentParents.parentUserId, session.user.id))

    return links
  },
)

// ── Get parents for a student ───────────────────────────────

export const getStudentParents = createServerFn({ method: 'GET' })
  .inputValidator((data: { studentProfileId: number }) => data)
  .handler(async ({ data }) => {
    const parents = await db
      .select({
        id: studentParents.id,
        parentUserId: studentParents.parentUserId,
        relation: studentParents.relation,
        parentName: user.name,
        parentEmail: user.email,
      })
      .from(studentParents)
      .innerJoin(user, eq(studentParents.parentUserId, user.id))
      .where(eq(studentParents.studentProfileId, data.studentProfileId))

    return parents
  })

// ── Add parent to student ───────────────────────────────────

export const addParentToStudent = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      studentProfileId: number
      parentUserId: string
      relation?: string | null
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const result = await db
      .insert(studentParents)
      .values({
        studentProfileId: data.studentProfileId,
        parentUserId: data.parentUserId,
        relation: data.relation ?? null,
      })
      .returning()
    return result[0]
  })

// ── Remove parent from student ──────────────────────────────

export const removeParentFromStudent = createServerFn({ method: 'POST' })
  .inputValidator((data: { linkId: number }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    await db
      .delete(studentParents)
      .where(eq(studentParents.id, data.linkId))
    return { success: true }
  })

// ── Check if user is parent of student ──────────────────────

export const isParentOfStudent = async (
  userId: string,
  studentProfileId: number,
): Promise<boolean> => {
  const link = await db
    .select()
    .from(studentParents)
    .where(
      and(
        eq(studentParents.studentProfileId, studentProfileId),
        eq(studentParents.parentUserId, userId),
      ),
    )
    .limit(1)
  return link.length > 0
}
