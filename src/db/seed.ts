import { config } from 'dotenv'
config({ path: ['.env.local', '.env'] })

import { drizzle } from 'drizzle-orm/libsql'
import { faker } from '@faker-js/faker/locale/en_IN'
import {
  classes,
  studentProfiles,
  attendance,
  fees,
  user,
  account,
} from './schema'

const db = drizzle(process.env.DATABASE_URL!)

// ── Helpers ──────────────────────────────────────────────────

function randomDate(start: string, end: string) {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return new Date(s + Math.random() * (e - s)).toISOString().split('T')[0]
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Data ─────────────────────────────────────────────────────

const sampleClasses = [
  { name: 'Playgroup', section: null, academicYear: '2025-2026', capacity: 20 },
  { name: 'Nursery', section: 'A', academicYear: '2025-2026', capacity: 25 },
  { name: 'Nursery', section: 'B', academicYear: '2025-2026', capacity: 25 },
  { name: 'LKG', section: null, academicYear: '2025-2026', capacity: 30 },
  { name: 'UKG', section: null, academicYear: '2025-2026', capacity: 30 },
]

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const genders = ['male', 'female']
const relations = ['Father', 'Mother', 'Guardian']
const transportModes = ['school_bus', 'van', 'self', 'other']

const studentNames = [
  // Nursery A (5)
  'Aarav Sharma', 'Diya Nair', 'Kabir Reddy', 'Ananya Iyer', 'Vihaan Kumar',
  // Nursery B (5)
  'Saanvi Patel', 'Arjun Menon', 'Ishaan Das', 'Myra Thomas', 'Reyansh Gupta',
  // LKG (5)
  'Aditya Rao', 'Prisha Joshi', 'Vivaan Shetty', 'Kiara Hegde', 'Arnav Kulkarni',
]

async function seed() {
  // ── 1. Seed classes (skip if already exist) ────────────────
  const existingClasses = await db.select().from(classes)
  let classRows = existingClasses

  if (existingClasses.length === 0) {
    console.log('Seeding classes...')
    for (const cls of sampleClasses) {
      await db.insert(classes).values(cls)
    }
    classRows = await db.select().from(classes)
    console.log(`  ✓ ${classRows.length} classes`)
  } else {
    console.log(`  ✓ Classes already exist (${existingClasses.length}), skipping`)
  }

  // Pick up to 3 classes — use whatever exists
  const availableClasses = classRows.slice(0, 3)
  if (availableClasses.length === 0) {
    console.error('No classes found in the database')
    return
  }

  console.log(`  Using classes: ${availableClasses.map((c) => `${c.name}${c.section ? ` ${c.section}` : ''} (id:${c.id})`).join(', ')}`)

  // Distribute 15 students across available classes (5 each)
  const classAssignments = studentNames.map(
    (_, i) => availableClasses[i % availableClasses.length].id,
  )

  // ── 2. Seed student profiles ──────────────────────────────
  console.log('Seeding students...')
  const studentIds: number[] = []

  for (let i = 0; i < studentNames.length; i++) {
    const name = studentNames[i]
    const classId = classAssignments[i]
    const gender = pick(genders)
    const parentFirstName = faker.person.firstName(gender === 'male' ? 'female' : 'male')
    const parentLastName = name.split(' ')[1]

    // Create a user account for the student's parent
    const parentEmail = faker.internet.email({
      firstName: parentFirstName,
      lastName: parentLastName,
    }).toLowerCase()
    const userId = faker.string.uuid()

    await db
      .insert(user)
      .values({
        id: userId,
        name: `${parentFirstName} ${parentLastName}`,
        email: parentEmail,
        emailVerified: true,
        image: null,
        role: 'student',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing()

    // Create account entry for email/password auth
    await db
      .insert(account)
      .values({
        id: faker.string.uuid(),
        accountId: userId,
        providerId: 'credential',
        userId,
        password: '$2b$10$dummyhashedpasswordforseeding000000000000000000',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing()

    const [profile] = await db
      .insert(studentProfiles)
      .values({
        studentName: name,
        userId,
        classId,
        dateOfBirth: randomDate('2020-01-01', '2022-06-30'),
        gender,
        bloodGroup: pick(bloodGroups),
        admissionDate: randomDate('2025-04-01', '2025-06-15'),
        admissionNumber: `IGS-2025-${String(i + 1).padStart(3, '0')}`,
        parentName: `${parentFirstName} ${parentLastName}`,
        parentRelation: pick(relations),
        parentPhone: `+91 ${faker.string.numeric(5)} ${faker.string.numeric(5)}`,
        parentEmail,
        parentOccupation: faker.person.jobTitle(),
        emergencyContact: faker.person.fullName(),
        emergencyPhone: `+91 ${faker.string.numeric(5)} ${faker.string.numeric(5)}`,
        address: `${faker.location.streetAddress()}, ${faker.location.city()}, Karnataka ${faker.location.zipCode()}`,
        nationality: 'Indian',
        transportMode: pick(transportModes),
      })
      .returning()

    studentIds.push(profile.id)
    console.log(`  ✓ ${name} → class ${classId} (user: ${parentEmail})`)
  }

  // ── 3. Seed attendance (last 30 school days) ──────────────
  console.log('Seeding attendance...')

  // Get all student profiles with userIds
  const allStudents = await db.select().from(studentProfiles)

  // Generate last 30 weekdays
  const schoolDays: string[] = []
  const today = new Date()
  let d = new Date(today)
  while (schoolDays.length < 30) {
    d.setDate(d.getDate() - 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) {
      // skip Sun/Sat
      schoolDays.push(d.toISOString().split('T')[0])
    }
  }

  const attendanceRows: (typeof attendance.$inferInsert)[] = []
  for (const student of allStudents) {
    if (!student.userId) continue
    for (const date of schoolDays) {
      const rand = Math.random()
      let status: string
      if (rand < 0.85) status = 'present'
      else if (rand < 0.95) status = 'absent'
      else status = 'late'

      attendanceRows.push({
        studentUserId: student.userId,
        date,
        status,
        notes: status === 'absent' ? pick(['Sick', 'Family event', 'Not well', '']) : null,
      })
    }
  }

  // Batch insert in chunks of 50, skip duplicates
  for (let i = 0; i < attendanceRows.length; i += 50) {
    await db
      .insert(attendance)
      .values(attendanceRows.slice(i, i + 50))
      .onConflictDoNothing()
  }
  console.log(`  ✓ ${attendanceRows.length} attendance records`)

  // ── 4. Seed fees ──────────────────────────────────────────
  console.log('Seeding fees...')

  const feeTerms = [
    { desc: 'Term 1 Tuition Fee', amount: 15000, due: '2025-06-01' },
    { desc: 'Term 2 Tuition Fee', amount: 15000, due: '2025-10-01' },
    { desc: 'Term 3 Tuition Fee', amount: 15000, due: '2026-01-15' },
    { desc: 'Annual Activity Fee', amount: 5000, due: '2025-06-01' },
  ]

  const feeRows: (typeof fees.$inferInsert)[] = []
  for (const student of allStudents) {
    if (!student.userId) continue
    for (const term of feeTerms) {
      const isPaid = Math.random() < 0.6
      feeRows.push({
        studentUserId: student.userId,
        amount: term.amount,
        dueDate: term.due,
        description: term.desc,
        status: isPaid ? 'paid' : 'pending',
        paidDate: isPaid ? randomDate(term.due, '2026-03-17') : null,
        paidAmount: isPaid ? term.amount : null,
        paymentMethod: isPaid ? pick(['upi', 'cash', 'bank_transfer', 'cheque']) : null,
        receiptNumber: isPaid ? `RCT-${faker.string.numeric(6)}` : null,
      })
    }
  }

  // Batch insert
  for (let i = 0; i < feeRows.length; i += 50) {
    await db.insert(fees).values(feeRows.slice(i, i + 50))
  }
  console.log(`  ✓ ${feeRows.length} fee records`)

  console.log('\nDone! 🎉')
}

seed().catch(console.error)
