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

// Backs better-auth's rate limiter. Workers isolates don't share memory, so the
// default in-memory storage would only throttle per-isolate — this table makes
// the limit global. Model/field names are fixed by better-auth.
export const rateLimit = sqliteTable('rate_limit', {
  id: text().primaryKey(),
  key: text(),
  count: integer(),
  lastRequest: integer('last_request'),
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

// ── Enquiries ────────────────────────────────────────────────

export const enquiries = sqliteTable('enquiries', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  // Child
  childName: text('child_name').notNull(),
  childDob: text('child_dob'),
  // Parent / guardian
  parentName: text('parent_name').notNull(),
  parentOccupation: text('parent_occupation'),
  parentPhone: text('parent_phone').notNull(),
  parentEmail: text('parent_email'),
  address: text(),
  // Enquiry
  enquiryDate: text('enquiry_date').notNull(), // YYYY-MM-DD
  source: text(), // word of mouth | google | social | hoarding | other
  // Campus visit appointment
  visitDate: text('visit_date'), // YYYY-MM-DD
  visitTime: text('visit_time'), // HH:mm
  // Workflow
  status: text().notNull().default('new'), // new | visit-scheduled | visited | applied | closed
  notes: text(), // internal staff notes
  assignedToUserId: text('assigned_to_user_id').references(() => user.id),
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
  currentClassId: integer('current_class_id').references(() => classes.id),
  dateOfBirth: text('date_of_birth'),
  gender: text(),
  bloodGroup: text('blood_group'),
  admissionDate: text('admission_date'),
  admissionNumber: text('admission_number'),
  photoUrl: text('photo_url'),
  // Parent / guardian 1
  parentName: text('parent_name'),
  parentRelation: text('parent_relation'),
  parentPhone: text('parent_phone'),
  parentEmail: text('parent_email'),
  parentOccupation: text('parent_occupation'),
  // Parent / guardian 2
  parent2Name: text('parent2_name'),
  parent2Relation: text('parent2_relation'),
  parent2Phone: text('parent2_phone'),
  parent2Email: text('parent2_email'),
  parent2Occupation: text('parent2_occupation'),
  // Parent / guardian 3
  parent3Name: text('parent3_name'),
  parent3Relation: text('parent3_relation'),
  parent3Phone: text('parent3_phone'),
  parent3Email: text('parent3_email'),
  parent3Occupation: text('parent3_occupation'),
  // Emergency
  emergencyContact: text('emergency_contact'),
  emergencyPhone: text('emergency_phone'),
  // Address & personal
  address: text(),
  languagesSpoken: text('languages_spoken'), // JSON array, e.g. '["Kannada","English"]'
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

// Where a student actually is now: their current class, falling back to the
// class they were admitted to when current_class_id was never set.
export const effectiveClassId = sql`COALESCE(${studentProfiles.currentClassId}, ${studentProfiles.classId})`

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

export const studentAttachments = sqliteTable('student_attachments', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  studentProfileId: integer('student_profile_id')
    .notNull()
    .references(() => studentProfiles.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  description: text(),
  attachmentUrl: text('attachment_url').notNull(),
  attachmentType: text('attachment_type').notNull(), // 'file' | 'link'
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

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

export const staffProfiles = sqliteTable('staff_profiles', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  staffName: text('staff_name').notNull(),
  employeeNumber: text('employee_number'),
  photoUrl: text('photo_url'),
  designation: text(),
  department: text(), // teaching | admin | support
  // Personal
  dateOfBirth: text('date_of_birth'),
  gender: text(),
  bloodGroup: text('blood_group'),
  maritalStatus: text('marital_status'),
  languagesSpoken: text('languages_spoken'), // JSON array, e.g. '["Kannada","English"]'
  religion: text(),
  // Contact
  phone: text(),
  alternatePhone: text('alternate_phone'),
  personalEmail: text('personal_email'),
  address: text(),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  emergencyContactRelation: text('emergency_contact_relation'),
  // Employment
  dateOfJoining: text('date_of_joining'),
  dateOfLeaving: text('date_of_leaving'),
  employmentType: text('employment_type'), // full-time | part-time | contract
  qualifications: text(),
  experienceYears: real('experience_years'),
  previousEmployer: text('previous_employer'),
  aadhaarNumber: text('aadhaar_number'),
  panNumber: text('pan_number'),
  // Timings
  defaultCheckIn: text('default_check_in'), // HH:mm
  defaultCheckOut: text('default_check_out'), // HH:mm
  workingDays: text('working_days'), // csv like "mon,tue,wed,thu,fri,sat"
  // Salary structure
  basicPay: real('basic_pay').default(0),
  hra: real().default(0),
  conveyanceAllowance: real('conveyance_allowance').default(0),
  medicalAllowance: real('medical_allowance').default(0),
  specialAllowance: real('special_allowance').default(0),
  otherAllowances: real('other_allowances').default(0),
  pfDeduction: real('pf_deduction').default(0),
  professionalTax: real('professional_tax').default(0),
  tdsDeduction: real('tds_deduction').default(0),
  otherDeductions: real('other_deductions').default(0),
  // Payment
  paymentMethod: text('payment_method'),
  bankName: text('bank_name'),
  bankAccountNumber: text('bank_account_number'),
  ifscCode: text('ifsc_code'),
  upiId: text('upi_id'),
  // Misc
  notes: text(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

export const staffAttachments = sqliteTable('staff_attachments', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  staffProfileId: integer('staff_profile_id')
    .notNull()
    .references(() => staffProfiles.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  description: text(),
  attachmentUrl: text('attachment_url').notNull(),
  attachmentType: text('attachment_type').notNull(), // 'file' | 'link'
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

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

export const transactions = sqliteTable('transactions', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  type: text().notNull(), // income | expense
  category: text().notNull(),
  amount: real().notNull(),
  date: text().notNull(),
  description: text(),
  paymentMethod: text('payment_method'),
  receiptNumber: text('receipt_number'),
  vendor: text(),
  notes: text(),
  attachmentUrl: text('attachment_url'),
  attachmentType: text('attachment_type'), // 'file' | 'link'
  createdByUserId: text('created_by_user_id').references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

export const staffSalaries = sqliteTable(
  'staff_salaries',
  {
    id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    staffName: text('staff_name').notNull(),
    designation: text(),
    month: text().notNull(), // YYYY-MM
    basicPay: real('basic_pay').notNull(),
    allowances: real().default(0),
    deductions: real().default(0),
    netPay: real('net_pay').notNull(),
    paidDate: text('paid_date'),
    paymentMethod: text('payment_method'),
    status: text().notNull().default('pending'), // pending | paid
    notes: text(),
    createdByUserId: text('created_by_user_id').references(() => user.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(
      sql`(unixepoch())`,
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
      sql`(unixepoch())`,
    ),
  },
  // One salary row per staff member per month — makes payroll generation
  // idempotent and prevents duplicate (double) payments.
  (table) => [
    uniqueIndex('staff_salaries_user_month_idx').on(table.userId, table.month),
  ],
)

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
  razorpayOrderId: text('razorpay_order_id'),
  razorpayPaymentId: text('razorpay_payment_id'),
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

export const feePayments = sqliteTable('fee_payments', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  feeId: integer('fee_id')
    .notNull()
    .references(() => fees.id, { onDelete: 'cascade' }),
  amount: real().notNull(),
  paidDate: text('paid_date').notNull(),
  paymentMethod: text('payment_method').notNull(), // cash | upi | bank_transfer | cheque | razorpay
  receiptNumber: text('receipt_number'),
  razorpayOrderId: text('razorpay_order_id'),
  razorpayPaymentId: text('razorpay_payment_id'),
  notes: text(),
  receivedByUserId: text('received_by_user_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

export const feeAttachments = sqliteTable('fee_attachments', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  feeId: integer('fee_id')
    .notNull()
    .references(() => fees.id, { onDelete: 'cascade' }),
  // Optional link to a specific payment within the fee (null = attached to the fee itself)
  feePaymentId: integer('fee_payment_id').references(() => feePayments.id, {
    onDelete: 'set null',
  }),
  title: text().notNull(),
  description: text(),
  attachmentUrl: text('attachment_url').notNull(),
  attachmentType: text('attachment_type').notNull(), // 'file' | 'link'
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

export const appSettings = sqliteTable('app_settings', {
  key: text().primaryKey(),
  value: text(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})
