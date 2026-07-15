import { createServerFn } from '@tanstack/react-start'
import { requireRole } from './auth-utils'
import { db } from '#/db'
import {
  user,
  account,
  session,
  studentProfiles,
  studentParents,
  staffAttendance,
  staffSalaries,
} from '#/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { z } from 'zod'

const roleSchema = z.enum(['admin', 'staff', 'student', 'auditor'])

export const listAllUsers = createServerFn({ method: 'GET' }).handler(
  async () => {
    // User management is excluded from the view-only auditor role.
    await requireRole(['admin'], { allowAuditor: false })
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
      })
      .from(user)

    // Fetch linked students for each user (via junction table)
    const studentLinks = await db
      .select({
        parentUserId: studentParents.parentUserId,
        studentId: studentProfiles.id,
        studentName: studentProfiles.studentName,
        admissionNumber: studentProfiles.admissionNumber,
      })
      .from(studentParents)
      .innerJoin(
        studentProfiles,
        eq(studentParents.studentProfileId, studentProfiles.id),
      )

    const childrenByParent = new Map<
      string,
      {
        studentId: number
        studentName: string
        admissionNumber: string | null
      }[]
    >()
    for (const link of studentLinks) {
      const list = childrenByParent.get(link.parentUserId) ?? []
      list.push({
        studentId: link.studentId,
        studentName: link.studentName,
        admissionNumber: link.admissionNumber,
      })
      childrenByParent.set(link.parentUserId, list)
    }

    return users.map((u) => ({
      ...u,
      linkedStudents: childrenByParent.get(u.id) ?? [],
    }))
  },
)

export const createUserByAdmin = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      name: z.string().trim().min(1).max(200),
      email: z.email().max(320),
      // Keep in sync with emailAndPassword.minPasswordLength in #/lib/auth.
      // createUserByAdmin hashes directly, so better-auth's own check is bypassed.
      password: z.string().min(10).max(200),
      role: roleSchema,
    }),
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])

    // Check if email already exists
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, data.email))
      .limit(1)

    if (existing.length > 0) {
      throw new Error('A user with this email already exists')
    }

    const userId = crypto.randomUUID()
    const now = new Date()
    const hashedPassword = await hashPassword(data.password)

    await db.insert(user).values({
      id: userId,
      name: data.name,
      email: data.email,
      emailVerified: true,
      image: null,
      role: data.role,
      createdAt: now,
      updatedAt: now,
    })

    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    })

    return { id: userId, name: data.name, email: data.email, role: data.role }
  })

export const listParentUsers = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin', 'staff'])
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.role, 'student'))
    return users
  },
)

export const setUserRole = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ userId: z.string().min(1), role: roleSchema }))
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await db
      .update(user)
      .set({ role: data.role, updatedAt: new Date() })
      .where(eq(user.id, data.userId))
    return { success: true }
  })

export const removeUser = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const adminSession = await requireRole(['admin'])

    // Prevent admin from deleting themselves
    if (adminSession.user.id === data.userId) {
      throw new Error('Cannot remove your own account')
    }

    // Delete all FK-constrained child records before deleting the user.
    // staffProfiles has onDelete:cascade so it is handled automatically.
    await db
      .delete(staffAttendance)
      .where(eq(staffAttendance.userId, data.userId))
    await db.delete(staffSalaries).where(eq(staffSalaries.userId, data.userId))
    await db
      .delete(studentParents)
      .where(eq(studentParents.parentUserId, data.userId))
    await db.delete(session).where(eq(session.userId, data.userId))
    await db.delete(account).where(eq(account.userId, data.userId))
    await db.delete(user).where(eq(user.id, data.userId))

    return { success: true }
  })
