import { createServerFn } from '@tanstack/react-start'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import { db } from '#/db'
import {
  attendance,
  feePayments,
  fees,
  studentProfiles,
  studentParents,
  user,
  classes,
} from '#/db/schema'
import { requireRole } from './auth-utils'
import { getSession } from './auth'

const optStr = z.string().max(2000).nullish()

// ── List all students (admin/staff) ─────────────────────────

export const listStudents = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin', 'staff'])

    const admittedClass = alias(classes, 'admitted_class')
    const currentClass = alias(classes, 'current_class')

    const profiles = await db
      .select({
        id: studentProfiles.id,
        studentName: studentProfiles.studentName,
        userId: studentProfiles.userId,
        classId: studentProfiles.classId,
        className: admittedClass.name,
        classSection: admittedClass.section,
        classAcademicYear: admittedClass.academicYear,
        currentClassId: studentProfiles.currentClassId,
        currentClassName: currentClass.name,
        currentClassSection: currentClass.section,
        currentClassAcademicYear: currentClass.academicYear,
        admissionNumber: studentProfiles.admissionNumber,
        gender: studentProfiles.gender,
        parentPhone: studentProfiles.parentPhone,
        isActive: studentProfiles.isActive,
        photoUrl: studentProfiles.photoUrl,
        userEmail: user.email,
      })
      .from(studentProfiles)
      .leftJoin(user, eq(studentProfiles.userId, user.id))
      .leftJoin(admittedClass, eq(studentProfiles.classId, admittedClass.id))
      .leftJoin(
        currentClass,
        eq(studentProfiles.currentClassId, currentClass.id),
      )

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
  .inputValidator(
    z.object({ studentId: z.number().int().positive(), isActive: z.boolean() }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const result = await db
      .update(studentProfiles)
      .set({ isActive: data.isActive, updatedAt: new Date() })
      .where(eq(studentProfiles.id, data.studentId))
      .returning()
    return result[0]
  })

// ── Bulk set current class (year-end promotion) ─────────────

export const bulkSetCurrentClass = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      studentIds: z.array(z.number().int().positive()).max(1000),
      currentClassId: z.number().int().positive().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    if (data.studentIds.length === 0) return { updated: 0 }
    const result = await db
      .update(studentProfiles)
      .set({ currentClassId: data.currentClassId, updatedAt: new Date() })
      .where(inArray(studentProfiles.id, data.studentIds))
      .returning({ id: studentProfiles.id })
    return { updated: result.length }
  })

// ── Bulk activate / deactivate ──────────────────────────────

export const bulkSetStudentActive = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      studentIds: z.array(z.number().int().positive()).max(1000),
      isActive: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    if (data.studentIds.length === 0) return { updated: 0 }
    const result = await db
      .update(studentProfiles)
      .set({ isActive: data.isActive, updatedAt: new Date() })
      .where(inArray(studentProfiles.id, data.studentIds))
      .returning({ id: studentProfiles.id })
    return { updated: result.length }
  })

// ── Delete student ──────────────────────────────────────────

export const deleteStudent = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ studentId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireRole(['admin'])

    // `fees.studentUserId` and `attendance.studentUserId` hold the student
    // PROFILE id as text, and neither has a DB-level foreign key — so deleting
    // the profile alone silently orphans them (and orphaned fees keep counting
    // toward the year-end summary). Cascade them here instead.
    const profileId = String(data.studentId)

    // Never destroy financial history. A student who has taken payments must be
    // deactivated, not deleted — that also keeps closed books intact.
    const [{ payments }] = await db
      .select({ payments: sql<number>`COUNT(*)` })
      .from(feePayments)
      .innerJoin(fees, eq(fees.id, feePayments.feeId))
      .where(eq(fees.studentUserId, profileId))

    if (Number(payments) > 0) {
      throw new Error(
        'This student has recorded fee payments and cannot be deleted, because it would destroy financial history. Deactivate the student instead.',
      )
    }

    await db.transaction(async (tx) => {
      // Only unpaid fees remain at this point (guarded above); deleting a fee
      // cascades to fee_payments via its FK.
      await tx.delete(fees).where(eq(fees.studentUserId, profileId))
      await tx.delete(attendance).where(eq(attendance.studentUserId, profileId))
      // student_parents and student_attachments already cascade from this row.
      await tx
        .delete(studentProfiles)
        .where(eq(studentProfiles.id, data.studentId))
    })

    return { success: true }
  })

// ── Get student profile ─────────────────────────────────────

export const getStudentProfile = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      userId: z.string().optional(),
      studentId: z.number().int().positive().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) throw new Error('Unauthorized')
    const userRole = (session.user as { role?: string }).role ?? 'student'
    const isStaffOrAdmin =
      userRole === 'admin' || userRole === 'staff' || userRole === 'auditor'

    // Non-staff may only read their own profile or a linked child's.
    const assertCanRead = async (
      profile: typeof studentProfiles.$inferSelect,
    ) => {
      if (isStaffOrAdmin) return
      if (profile.userId === session.user.id) return
      if (await isParentOfStudent(session.user.id, profile.id)) return
      throw new Error('Forbidden')
    }

    const admittedClass = alias(classes, 'admitted_class')
    const currentClass = alias(classes, 'current_class')

    const build = () =>
      db
        .select({
          profile: studentProfiles,
          className: admittedClass.name,
          classSection: admittedClass.section,
          classAcademicYear: admittedClass.academicYear,
          currentClassName: currentClass.name,
          currentClassSection: currentClass.section,
          currentClassAcademicYear: currentClass.academicYear,
        })
        .from(studentProfiles)
        .leftJoin(admittedClass, eq(studentProfiles.classId, admittedClass.id))
        .leftJoin(
          currentClass,
          eq(studentProfiles.currentClassId, currentClass.id),
        )

    const parseProfile = (row: {
      profile: typeof studentProfiles.$inferSelect
      className: string | null
      classSection: string | null
      classAcademicYear: string | null
      currentClassName: string | null
      currentClassSection: string | null
      currentClassAcademicYear: string | null
    }) => ({
      ...row.profile,
      languagesSpoken: row.profile.languagesSpoken
        ? (JSON.parse(row.profile.languagesSpoken) as string[])
        : null,
      className: row.className,
      classSection: row.classSection,
      classAcademicYear: row.classAcademicYear,
      currentClassName: row.currentClassName,
      currentClassSection: row.currentClassSection,
      currentClassAcademicYear: row.currentClassAcademicYear,
    })

    if (data.studentId) {
      const rows = await build()
        .where(eq(studentProfiles.id, data.studentId))
        .limit(1)
      if (!rows[0]) return null
      await assertCanRead(rows[0].profile)
      return parseProfile(rows[0])
    }
    if (data.userId) {
      const rows = await build()
        .where(eq(studentProfiles.userId, data.userId))
        .limit(1)
      if (!rows[0]) return null
      await assertCanRead(rows[0].profile)
      return parseProfile(rows[0])
    }
    return null
  })

// ── Create student profile ──────────────────────────────────

export const createStudentProfile = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      studentName: z.string().trim().min(1).max(200),
      userId: z.string().nullish(),
      classId: z.number().int().positive().nullish(),
      currentClassId: z.number().int().positive().nullish(),
      dateOfBirth: optStr,
      gender: optStr,
      bloodGroup: optStr,
      admissionDate: optStr,
      admissionNumber: optStr,
      photoUrl: optStr,
      parentName: optStr,
      parentRelation: optStr,
      parentPhone: optStr,
      parentEmail: optStr,
      parentOccupation: optStr,
      emergencyContact: optStr,
      emergencyPhone: optStr,
      address: optStr,
      languagesSpoken: z.array(z.string()).nullish(),
      religion: optStr,
      caste: optStr,
      aadhaarNumber: optStr,
      previousSchool: optStr,
      transferCertificateNumber: optStr,
      transportMode: optStr,
      transportRoute: optStr,
      medicalNotes: optStr,
      allergies: optStr,
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const insertData = { ...data } as Record<string, unknown>
    // Default current class to the admitted class so attendance/fees resolve
    // correctly for brand-new students before any promotion.
    if (insertData.currentClassId == null && insertData.classId != null) {
      insertData.currentClassId = insertData.classId
    }
    if (Array.isArray(insertData.languagesSpoken)) {
      insertData.languagesSpoken = JSON.stringify(insertData.languagesSpoken)
    }
    const result = await db
      .insert(studentProfiles)
      .values(insertData as typeof studentProfiles.$inferInsert)
      .returning()
    return result[0]
  })

// ── Update student profile ──────────────────────────────────

// Never accept these from the client on an update — they govern identity,
// enrollment linkage, and audit timestamps.
const IMMUTABLE_PROFILE_FIELDS = new Set([
  'id',
  'userId',
  'createdAt',
  'updatedAt',
])

// Fields a student/parent may edit on their own/child's profile. Enrollment and
// status fields (classId, currentClassId, admissionNumber, admissionDate,
// isActive) are intentionally excluded — only admin/staff change those.
const STUDENT_SELF_EDITABLE_FIELDS = new Set([
  'studentName',
  'dateOfBirth',
  'gender',
  'bloodGroup',
  'photoUrl',
  'parentName',
  'parentRelation',
  'parentPhone',
  'parentEmail',
  'parentOccupation',
  'parent2Name',
  'parent2Relation',
  'parent2Phone',
  'parent2Email',
  'parent2Occupation',
  'parent3Name',
  'parent3Relation',
  'parent3Phone',
  'parent3Email',
  'parent3Occupation',
  'emergencyContact',
  'emergencyPhone',
  'address',
  'languagesSpoken',
  'religion',
  'caste',
  'aadhaarNumber',
  'previousSchool',
  'transferCertificateNumber',
  'transportMode',
  'transportRoute',
  'transportPickupPerson',
  'transportPickupPhone',
  'transportDropPerson',
  'transportDropPhone',
  'medicalNotes',
  'allergies',
])

export const updateStudentProfile = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      studentId: z.number().int().positive(),
      updates: z.record(z.string(), z.unknown()),
    }),
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

    const isPrivileged = userRole === 'admin' || userRole === 'staff'

    // Whitelist the incoming fields: strip immutable keys for everyone, and
    // restrict non-privileged users to the self-editable set. Prevents mass
    // assignment of userId, enrollment, and isActive.
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data.updates)) {
      if (IMMUTABLE_PROFILE_FIELDS.has(key)) continue
      if (!isPrivileged && !STUDENT_SELF_EDITABLE_FIELDS.has(key)) continue
      updates[key] = value
    }

    if (Array.isArray(updates.languagesSpoken)) {
      updates.languagesSpoken = JSON.stringify(updates.languagesSpoken)
    }
    const result = await db
      .update(studentProfiles)
      .set({
        ...(updates as Partial<typeof studentProfiles.$inferInsert>),
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
  .inputValidator(z.object({ studentProfileId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
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
  .inputValidator(z.object({ linkId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    await db.delete(studentParents).where(eq(studentParents.id, data.linkId))
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
