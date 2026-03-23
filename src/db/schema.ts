import {
  sqliteTable,
  integer,
  text,
  real,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ── Better Auth core tables ──────────────────────────────────

export const user = sqliteTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: integer({ mode: 'boolean' }).notNull(),
  image: text(),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  updatedAt: integer({ mode: 'timestamp' }).notNull(),
  role: text(),
  banned: integer({ mode: 'boolean' }),
  banReason: text(),
  banExpires: integer({ mode: 'timestamp' }),
})

export const session = sqliteTable('session', {
  id: text().primaryKey(),
  expiresAt: integer({ mode: 'timestamp' }).notNull(),
  token: text().notNull().unique(),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  updatedAt: integer({ mode: 'timestamp' }).notNull(),
  ipAddress: text(),
  userAgent: text(),
  userId: text()
    .notNull()
    .references(() => user.id),
  impersonatedBy: text(),
})

export const account = sqliteTable('account', {
  id: text().primaryKey(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text()
    .notNull()
    .references(() => user.id),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: integer({ mode: 'timestamp' }),
  refreshTokenExpiresAt: integer({ mode: 'timestamp' }),
  scope: text(),
  password: text(),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  updatedAt: integer({ mode: 'timestamp' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: integer({ mode: 'timestamp' }).notNull(),
  createdAt: integer({ mode: 'timestamp' }),
  updatedAt: integer({ mode: 'timestamp' }),
})

// ── Contact submissions ──────────────────────────────────────

export const contactSubmissions = sqliteTable('contact_submissions', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  phone: text().notNull(),
  email: text().notNull(),
  subject: text().notNull(),
  message: text().notNull(),
  status: text().notNull().default('new'), // new | read | replied | archived
  notes: text(), // internal staff notes
  repliedByUserId: text('replied_by_user_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

// ── App tables ───────────────────────────────────────────────

export const todos = sqliteTable('todos', {
  id: integer({ mode: 'number' }).primaryKey({
    autoIncrement: true,
  }),
  title: text().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

export const classes = sqliteTable('classes', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  section: text(),
  academicYear: text('academic_year').notNull(),
  capacity: integer(),
  teacherUserId: text('teacher_user_id'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

export const studentProfiles = sqliteTable('student_profiles', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  studentName: text('student_name').notNull(),
  userId: text('user_id').unique(),
  classId: integer('class_id').references(() => classes.id),
  dateOfBirth: text('date_of_birth'),
  gender: text(),
  bloodGroup: text('blood_group'),
  admissionDate: text('admission_date'),
  admissionNumber: text('admission_number'),
  photoUrl: text('photo_url'),
  // Parent / guardian
  parentName: text('parent_name'),
  parentRelation: text('parent_relation'),
  parentPhone: text('parent_phone'),
  parentEmail: text('parent_email'),
  parentOccupation: text('parent_occupation'),
  // Emergency
  emergencyContact: text('emergency_contact'),
  emergencyPhone: text('emergency_phone'),
  // Address & personal
  address: text(),
  nationality: text(),
  religion: text(),
  caste: text(),
  aadhaarNumber: text('aadhaar_number'),
  // Previous school
  previousSchool: text('previous_school'),
  transferCertificateNumber: text('transfer_certificate_number'),
  // Transport
  transportMode: text('transport_mode'),
  transportRoute: text('transport_route'),
  transportPickupPerson: text('transport_pickup_person'),
  transportPickupPhone: text('transport_pickup_phone'),
  transportDropPerson: text('transport_drop_person'),
  transportDropPhone: text('transport_drop_phone'),
  // Medical
  medicalNotes: text('medical_notes'),
  allergies: text(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

export const studentParents = sqliteTable(
  'student_parents',
  {
    id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
    studentProfileId: integer('student_profile_id')
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    parentUserId: text('parent_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    relation: text(), // mother, father, guardian, etc.
    createdAt: integer('created_at', { mode: 'timestamp' }).default(
      sql`(unixepoch())`,
    ),
  },
  (table) => [
    uniqueIndex('student_parents_unique_idx').on(
      table.studentProfileId,
      table.parentUserId,
    ),
  ],
)

export const attendance = sqliteTable(
  'attendance',
  {
    id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
    studentUserId: text('student_user_id').notNull(),
    date: text().notNull(),
    status: text().notNull(),
    notes: text(),
    markedByUserId: text('marked_by_user_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(
      sql`(unixepoch())`,
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
      sql`(unixepoch())`,
    ),
  },
  (table) => [
    uniqueIndex('attendance_student_date_idx').on(
      table.studentUserId,
      table.date,
    ),
  ],
)

export const staffAttendance = sqliteTable(
  'staff_attendance',
  {
    id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    date: text().notNull(),
    status: text().notNull(), // present | absent | late | leave
    checkIn: text('check_in'),
    checkOut: text('check_out'),
    notes: text(),
    markedByUserId: text('marked_by_user_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(
      sql`(unixepoch())`,
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
      sql`(unixepoch())`,
    ),
  },
  (table) => [
    uniqueIndex('staff_attendance_user_date_idx').on(table.userId, table.date),
  ],
)

export const calendarEvents = sqliteTable('calendar_events', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  description: text(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'), // null = single-day event
  type: text().notNull().default('event'), // event | holiday | exam | meeting | deadline
  color: text(), // optional color override
  createdByUserId: text('created_by_user_id').references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

export const fees = sqliteTable('fees', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  studentUserId: text('student_user_id').notNull(),
  amount: real().notNull(),
  dueDate: text('due_date').notNull(),
  paidDate: text('paid_date'),
  paidAmount: real('paid_amount'),
  status: text().notNull().default('pending'),
  paymentMethod: text('payment_method'),
  receiptNumber: text('receipt_number'),
  description: text(),
  notes: text(),
  receivedByUserId: text('received_by_user_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})
