import { createServerFn } from '@tanstack/react-start'
import { and, eq, desc, ne } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { db } from '#/db'
import {
  user,
  account,
  session,
  staffProfiles,
  staffSalaries,
  staffAttendance,
} from '#/db/schema'
import { requireRole } from './auth-utils'
import { isPlaceholderEmail, placeholderEmail } from '#/lib/email'

export type StaffProfile = typeof staffProfiles.$inferSelect

// ── List staff (admin) ──────────────────────────────────────

export const listStaff = createServerFn({ method: 'GET' }).handler(async () => {
  await requireRole(['admin'])
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      banned: user.banned,
      profileId: staffProfiles.id,
      staffName: staffProfiles.staffName,
      employeeNumber: staffProfiles.employeeNumber,
      designation: staffProfiles.designation,
      department: staffProfiles.department,
      phone: staffProfiles.phone,
      photoUrl: staffProfiles.photoUrl,
      defaultCheckIn: staffProfiles.defaultCheckIn,
      defaultCheckOut: staffProfiles.defaultCheckOut,
      basicPay: staffProfiles.basicPay,
      isActive: staffProfiles.isActive,
    })
    .from(user)
    .leftJoin(staffProfiles, eq(staffProfiles.userId, user.id))
    .where(eq(user.role, 'staff'))

  return rows
})

// ── Get one staff profile ───────────────────────────────────

export const getStaffProfile = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin', 'staff'])
    const profile = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, data.userId))
      .limit(1)
    const userRow = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, data.userId))
      .limit(1)
    if (!userRow[0]) return null
    const raw = profile[0] ?? null
    return {
      user: userRow[0],
      profile: raw
        ? {
            ...raw,
            languagesSpoken: raw.languagesSpoken
              ? (JSON.parse(raw.languagesSpoken) as string[])
              : null,
          }
        : null,
    }
  })

// ── Create staff (user + profile) ───────────────────────────

export const createStaff = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      name: string
      email: string
      password: string
      profile: Partial<
        Omit<StaffProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
      >
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])

    const userId = crypto.randomUUID()
    const trimmed = data.email.trim().toLowerCase()
    const finalEmail = trimmed || placeholderEmail(userId)

    if (trimmed) {
      const existing = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, finalEmail))
        .limit(1)
      if (existing.length > 0)
        throw new Error('A user with this email already exists')
    }

    const now = new Date()
    const hashed = await hashPassword(data.password)

    await db.insert(user).values({
      id: userId,
      name: data.name,
      email: finalEmail,
      emailVerified: true,
      image: null,
      role: 'staff',
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    })

    const profileData = { ...data.profile } as Record<string, unknown>
    if (Array.isArray(profileData.languagesSpoken)) {
      profileData.languagesSpoken = JSON.stringify(profileData.languagesSpoken)
    }
    await db.insert(staffProfiles).values({
      userId,
      staffName: data.name,
      isActive: true,
      ...profileData,
    })

    return { userId }
  })

// ── Update staff profile ────────────────────────────────────

export const updateStaffProfile = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      userId: string
      updates: Partial<
        Omit<StaffProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
      >
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const existing = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, data.userId))
      .limit(1)
    const now = new Date()

    const updates = { ...data.updates } as Record<string, unknown>
    if (Array.isArray(updates.languagesSpoken)) {
      updates.languagesSpoken = JSON.stringify(updates.languagesSpoken)
    }
    if (existing[0]) {
      await db
        .update(staffProfiles)
        .set({ ...updates, updatedAt: now })
        .where(eq(staffProfiles.userId, data.userId))
    } else {
      const userRow = await db
        .select()
        .from(user)
        .where(eq(user.id, data.userId))
        .limit(1)
      await db.insert(staffProfiles).values({
        userId: data.userId,
        staffName: userRow[0]?.name ?? 'Staff',
        isActive: true,
        ...updates,
      })
    }

    if (
      typeof data.updates.staffName === 'string' &&
      data.updates.staffName.trim()
    ) {
      await db
        .update(user)
        .set({ name: data.updates.staffName.trim(), updatedAt: now })
        .where(eq(user.id, data.userId))
    }

    return { success: true }
  })

// ── Update login email (admin only) ─────────────────────────

export const updateStaffLoginEmail = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string; email: string }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    const trimmed = data.email.trim().toLowerCase()
    const newEmail = trimmed || placeholderEmail(data.userId)

    if (trimmed && !isPlaceholderEmail(trimmed)) {
      if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
        throw new Error('Invalid email')
      }
      const conflict = await db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.email, newEmail), ne(user.id, data.userId)))
        .limit(1)
      if (conflict.length > 0) {
        throw new Error('A user with this email already exists')
      }
    }

    const now = new Date()
    await db
      .update(user)
      .set({ email: newEmail, updatedAt: now })
      .where(eq(user.id, data.userId))

    await db
      .update(account)
      .set({ accountId: newEmail, updatedAt: now })
      .where(
        and(
          eq(account.userId, data.userId),
          eq(account.providerId, 'credential'),
        ),
      )

    return { success: true }
  })

// ── Toggle active ───────────────────────────────────────────

export const toggleStaffActive = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string; isActive: boolean }) => data)
  .handler(async ({ data }) => {
    await requireRole(['admin'])
    await db
      .update(staffProfiles)
      .set({ isActive: data.isActive, updatedAt: new Date() })
      .where(eq(staffProfiles.userId, data.userId))
    return { success: true }
  })

// ── Delete staff ────────────────────────────────────────────

export const deleteStaff = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const adminSession = await requireRole(['admin'])
    if (adminSession.user.id === data.userId) {
      throw new Error('Cannot remove your own account')
    }
    await db
      .delete(staffAttendance)
      .where(eq(staffAttendance.userId, data.userId))
    await db.delete(staffSalaries).where(eq(staffSalaries.userId, data.userId))
    await db.delete(staffProfiles).where(eq(staffProfiles.userId, data.userId))
    await db.delete(session).where(eq(session.userId, data.userId))
    await db.delete(account).where(eq(account.userId, data.userId))
    await db.delete(user).where(eq(user.id, data.userId))
    return { success: true }
  })

// ── Generate payroll for a month ────────────────────────────

export const generatePayroll = createServerFn({ method: 'POST' })
  .inputValidator((data: { month: string }) => data) // YYYY-MM
  .handler(async ({ data }) => {
    const adminSession = await requireRole(['admin'])
    const profiles = await db
      .select({
        userId: staffProfiles.userId,
        staffName: staffProfiles.staffName,
        designation: staffProfiles.designation,
        basicPay: staffProfiles.basicPay,
        hra: staffProfiles.hra,
        conveyanceAllowance: staffProfiles.conveyanceAllowance,
        medicalAllowance: staffProfiles.medicalAllowance,
        specialAllowance: staffProfiles.specialAllowance,
        otherAllowances: staffProfiles.otherAllowances,
        pfDeduction: staffProfiles.pfDeduction,
        professionalTax: staffProfiles.professionalTax,
        tdsDeduction: staffProfiles.tdsDeduction,
        otherDeductions: staffProfiles.otherDeductions,
        paymentMethod: staffProfiles.paymentMethod,
        isActive: staffProfiles.isActive,
      })
      .from(staffProfiles)
      .where(eq(staffProfiles.isActive, true))

    let created = 0
    let skipped = 0

    for (const p of profiles) {
      const already = await db
        .select({ id: staffSalaries.id })
        .from(staffSalaries)
        .where(
          and(
            eq(staffSalaries.userId, p.userId),
            eq(staffSalaries.month, data.month),
          ),
        )
        .limit(1)
      if (already.length > 0) {
        skipped++
        continue
      }

      const basic = p.basicPay ?? 0
      const allowances =
        (p.hra ?? 0) +
        (p.conveyanceAllowance ?? 0) +
        (p.medicalAllowance ?? 0) +
        (p.specialAllowance ?? 0) +
        (p.otherAllowances ?? 0)
      const deductions =
        (p.pfDeduction ?? 0) +
        (p.professionalTax ?? 0) +
        (p.tdsDeduction ?? 0) +
        (p.otherDeductions ?? 0)
      const netPay = basic + allowances - deductions

      await db.insert(staffSalaries).values({
        userId: p.userId,
        staffName: p.staffName,
        designation: p.designation,
        month: data.month,
        basicPay: basic,
        allowances,
        deductions,
        netPay,
        status: 'pending',
        paymentMethod: p.paymentMethod,
        createdByUserId: adminSession.user.id,
      })
      created++
    }

    return { created, skipped }
  })

// ── Salary slip data ────────────────────────────────────────

export const getSalarySlip = createServerFn({ method: 'GET' })
  .inputValidator((data: { salaryId: number }) => data)
  .handler(async ({ data }) => {
    const session = await requireRole(['admin', 'staff'])
    const salary = await db
      .select()
      .from(staffSalaries)
      .where(eq(staffSalaries.id, data.salaryId))
      .limit(1)
    if (!salary[0]) return null

    const role = (session.user as { role?: string }).role ?? 'staff'
    if (
      role !== 'admin' &&
      role !== 'auditor' &&
      salary[0].userId !== session.user.id
    ) {
      throw new Error('Forbidden')
    }

    const profile = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, salary[0].userId))
      .limit(1)
    return {
      salary: salary[0],
      profile: profile[0] ?? null,
    }
  })

// ── Salary history for one staff ────────────────────────────

export const getStaffSalaryHistory = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireRole(['admin', 'staff'])
    const role = (session.user as { role?: string }).role ?? 'staff'
    if (
      role !== 'admin' &&
      role !== 'auditor' &&
      data.userId !== session.user.id
    ) {
      throw new Error('Forbidden')
    }
    return db
      .select()
      .from(staffSalaries)
      .where(eq(staffSalaries.userId, data.userId))
      .orderBy(desc(staffSalaries.month))
  })

// ── Attendance history for one staff ────────────────────────

export const getStaffAttendanceHistory = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireRole(['admin', 'staff'])
    const role = (session.user as { role?: string }).role ?? 'staff'
    if (
      role !== 'admin' &&
      role !== 'auditor' &&
      data.userId !== session.user.id
    ) {
      throw new Error('Forbidden')
    }
    return db
      .select()
      .from(staffAttendance)
      .where(eq(staffAttendance.userId, data.userId))
      .orderBy(desc(staffAttendance.date))
  })
