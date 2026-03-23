import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { requireRole } from './auth-utils'
import { db } from '#/db'
import { user, account, studentProfiles, studentParents } from '#/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'

export const listAllUsers = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireRole(['admin'])
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
      { studentId: number; studentName: string; admissionNumber: string | null }[]
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
    (data: {
      name: string
      email: string
      password: string
      role: string
    }) => data,
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
  .inputValidator((data: { userId: string; role: string }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const request = getRequest()
    await auth.api.setRole({
      headers: request.headers,
      body: {
        userId: data.userId,
        role: data.role as 'admin' | 'staff' | 'student',
      },
    })
    return { success: true }
  })

export const removeUser = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const request = getRequest()
    await auth.api.removeUser({
      headers: request.headers,
      body: {
        userId: data.userId,
      },
    })
    return { success: true }
  })
