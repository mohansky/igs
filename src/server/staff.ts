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
import { z } from 'zod'

export type StaffProfile = typeof staffProfiles.$inferSelect

// ── List staff (admin) ──────────────────────────────────────

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
const timeString = z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:mm')
const monthString = z.string().regex(/^\d{4}-\d{2}$/, 'Expected YYYY-MM')

// Salary components must be finite and non-negative — a NaN/Infinity or a
// negative here would silently corrupt payroll totals.
const money = z.number().finite().nonnegative()
const text = (max: number) => z.string().max(max).nullish()

// Explicit whitelist of writable staff-profile columns. id / userId /
// createdAt / updatedAt are deliberately absent so they can't be mass-assigned.
const staffProfileFields = {
  staffName: z.string().trim().min(1).max(200),
  employeeNumber: text(50),
  photoUrl: text(1000),
  designation: text(200),
  department: z.enum(['teaching', 'admin', 'support']).nullish(),
  dateOfBirth: dateString.nullish(),
  gender: text(30),
  bloodGroup: text(10),
  maritalStatus: text(30),
  languagesSpoken: z.array(z.string().max(50)).nullish(),
  religion: text(50),
  phone: text(30),
  alternatePhone: text(30),
  personalEmail: text(320),
  address: text(1000),
  emergencyContactName: text(200),
  emergencyContactPhone: text(30),
  emergencyContactRelation: text(50),
  dateOfJoining: dateString.nullish(),
  dateOfLeaving: dateString.nullish(),
  employmentType: z.enum(['full-time', 'part-time', 'contract']).nullish(),
  qualifications: text(1000),
  experienceYears: z.number().finite().nonnegative().max(80).nullish(),
  previousEmployer: text(200),
  aadhaarNumber: text(20),
  panNumber: text(20),
  defaultCheckIn: timeString.nullish(),
  defaultCheckOut: timeString.nullish(),
  workingDays: text(100),
  basicPay: money.nullish(),
  hra: money.nullish(),
  conveyanceAllowance: money.nullish(),
  medicalAllowance: money.nullish(),
  specialAllowance: money.nullish(),
  otherAllowances: money.nullish(),
  pfDeduction: money.nullish(),
  professionalTax: money.nullish(),
  tdsDeduction: money.nullish(),
  otherDeductions: money.nullish(),
  paymentMethod: text(50),
  bankName: text(200),
  bankAccountNumber: text(50),
  ifscCode: text(20),
  upiId: text(100),
  notes: text(2000),
  isActive: z.boolean().nullish(),
}

// createStaff allows an empty email (a placeholder is generated), so validate
// the format only when one is actually supplied.
const optionalEmail = z
  .string()
  .max(320)
  .refine((v) => v.trim() === '' || z.email().safeParse(v).success, {
    message: 'Invalid email address',
  })

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
  .inputValidator(z.object({ userId: z.string().min(1) }))
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
    z.object({
      name: z.string().trim().min(1).max(200),
      email: optionalEmail,
      // Keep in sync with emailAndPassword.minPasswordLength in #/lib/auth.
      password: z.string().min(10).max(200),
      profile: z.object(staffProfileFields).partial(),
    }),
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
    z.object({
      userId: z.string().min(1),
      updates: z.object(staffProfileFields).partial(),
    }),
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
  .inputValidator(
    z.object({ userId: z.string().min(1), email: z.email().max(320) }),
  )
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
  .inputValidator(
    z.object({ userId: z.string().min(1), isActive: z.boolean() }),
  )
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
  .inputValidator(z.object({ userId: z.string().min(1) }))
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
  .inputValidator(z.object({ month: monthString }))
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

    if (profiles.length === 0) return { created: 0, skipped: 0 }

    const rows = profiles.map((p) => {
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

      return {
        userId: p.userId,
        staffName: p.staffName,
        designation: p.designation,
        month: data.month,
        basicPay: basic,
        allowances,
        deductions,
        netPay: basic + allowances - deductions,
        status: 'pending',
        paymentMethod: p.paymentMethod,
        createdByUserId: adminSession.user.id,
      }
    })

    // A single conflict-safe insert. The unique index on (user_id, month) makes
    // this idempotent, so a double-click can't create duplicate salary rows —
    // unlike the previous check-then-insert, which raced.
    const inserted = await db
      .insert(staffSalaries)
      .values(rows)
      .onConflictDoNothing({
        target: [staffSalaries.userId, staffSalaries.month],
      })
      .returning({ id: staffSalaries.id })

    return { created: inserted.length, skipped: rows.length - inserted.length }
  })

// ── Salary slip data ────────────────────────────────────────

export const getSalarySlip = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ salaryId: z.number().int().positive() }))
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
  .inputValidator(z.object({ userId: z.string().min(1) }))
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
  .inputValidator(z.object({ userId: z.string().min(1) }))
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
