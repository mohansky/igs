# Student Management Enhancement Plan

## Overview
Expand the existing `studentProfiles` table with new fields, make `userId` optional so admin/staff can add students before they have accounts, add a student list + create page in the dashboard, and allow students to edit their own profile.

---

## Step 1: Schema Changes (`src/db/schema.ts`)

Update `studentProfiles` table:
- Add `studentName` (text, required) — identifies students without linked accounts
- Make `userId` optional (nullable) instead of `.notNull()`
- Add new fields:
  - `photoUrl` (text) — student photo URL
  - `previousSchool` (text)
  - `transferCertificateNumber` (text)
  - `transportMode` (text) — e.g. bus, van, self
  - `transportRoute` (text)
  - `nationality` (text)
  - `religion` (text)
  - `caste` (text)
  - `aadhaarNumber` (text)

## Step 2: Push Schema to DB

Run `pnpm db:push` to apply the schema changes to the SQLite database.

## Step 3: Server Functions (`src/server/students.ts`)

- Update `createStudentProfile` — require `studentName`, make `userId` optional, add all new fields
- Update `updateStudentProfile` — allow students to update their OWN profile (check `session.user.id === data.userId`), admin/staff can update any
- Update `listStudents` — join with `user` table to include linked user email/name
- Update `getStudentProfile` — also support fetching by profile `id` (not just `userId`)

## Step 4: Update `StudentProfileForm` (`src/components/dashboard/StudentProfileForm.tsx`)

Add form fields for all new columns: studentName, photoUrl, previousSchool, transferCertificateNumber, transportMode, transportRoute, nationality, religion, caste, aadhaarNumber.

## Step 5: New Route — Student List (`src/routes/dashboard/students.index.tsx`)

- Admin/staff only
- Table listing all students with: name, admission #, class, status
- "Add Student" button linking to create page
- Rows link to existing `students/$studentId` detail page

## Step 6: New Route — Create Student (`src/routes/dashboard/students.new.tsx`)

- Admin/staff only
- Uses the updated `StudentProfileForm`
- Optional field to link a user account (dropdown of users with student role)
- Redirects to student list on success

## Step 7: Update Dashboard Nav (`src/routes/dashboard.tsx`)

Add `{ to: '/dashboard/students', label: 'Students', roles: ['admin', 'staff'] }` to the nav items.

## Step 8: Update Profile Page (`src/routes/dashboard/profile.tsx`)

- Allow students to call `updateStudentProfile` for their own profile (server-side auth check)
- Show new fields in the form

## Step 9: Update Student Detail Page (`src/routes/dashboard/students.$studentId.tsx`)

- Fetch by profile ID instead of userId
- Display all new fields (photo, previous school, transport, nationality, etc.)
