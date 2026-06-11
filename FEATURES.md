# Features

A running inventory of what the demo school management system can do today, plus a TODO list of ideas worth exploring.

## Implemented

### Authentication & access

- Email/password auth (Better Auth, admin plugin)
- Three roles: `admin`, `staff`, `student` (parent accounts share the `student` role)
- Role-gated navigation and route guards
- Password change from the profile page
- Avatar upload (Cloudflare R2) with graceful initials fallback

### Dashboard overview

- Role-specific landing view (admin / staff / parent-student)
- Stat cards: total students, today's attendance %, fee collection %, pending fees
- Attendance trend chart (last 7 days, variance-aware bar scaling)
- Income vs expenses (6-month stacked bar)
- Fee collection progress ring
- Alerts card: overdue fees, low attendance (<75%), unread submissions
- Staff attendance summary (today)
- Recent activity feed (registrations, payments, submissions)
- Upcoming events (next 7 days)
- Quick-link tiles

### Students

- List with filters (name, admission #, class, status), sort, CSV export
- Activate/deactivate via inline switch
- Detail page with attendance + fee history
- Add-student form with parent linking
- Soft activate vs hard delete (admin only)

### Attendance

- Daily attendance marking by class
- Student attendance history
- Staff attendance (admin)

### Fees

- Record, edit, delete fee entries
- Partial/full/overdue status
- Payment entry with method + receipt #
- Filters: student, description, status, due-date month, paid-date month, date range
- CSV export
- Parent view of child's fee status

### Finance

- Expenses & income transactions
- Filters: date range, month, category, vendor, payment method
- Monthly summary + recent transactions on dashboard

### Staff management

- Staff directory (admin): list, create, edit, activate/deactivate, delete
- Full staff profiles: identity, personal, contact, emergency contact, employment history, qualifications, bank/UPI details
- Default check-in / check-out times per staff — auto-filled in attendance marker
- Per-staff salary structure: basic, HRA, conveyance, medical, special, other allowances; PF, professional tax, TDS, other deductions
- One-click payroll generation for a month — creates pending salary rows for all active staff using their stored structure (idempotent)
- Printable salary slips (Print / Save as PDF) with earnings/deductions breakdown
- Staff attendance tracking (admin)
- Per-staff tabs: Profile, Salary history (with slip links), Attendance history
- Homeroom teacher assignment per class

### Classes

- CRUD classes with sections
- Teacher assignment

### Users (admin)

- List, role change (admin/staff/student), delete

### Calendar

- Events, holidays, exams
- Used for upcoming-events card

### Contact submissions

- Public contact form → submissions inbox
- Read/unread status

### Profile

- Account info + avatar upload
- Change password
- Linked children (parents)
- Student profile (for students / staff-with-profiles)
- **Preferences** — theme (light/dark/auto), default rows per table, density (comfortable/compact), date format, sidebar default open/collapsed, landing page after login

### Global search

- Command palette (Ctrl/Cmd + K) across navigation, students, and events

### Public site

- Home, About, Admissions, Contact, Sign-in, Gallery
- Blog (MDX via Content Collections) + RSS feed
- SEO meta + Schema.org
- Header theme toggle
- Fraunces + Raleway typography, glass-shell brand styling

### Shared table UX

- TanStack Table: sort, column filters, pagination
- Page size persisted per-table + global default
- Compact/comfortable density via CSS class on `<html>`
- Date range picker + month dropdowns on data-heavy tables
- CSV export helpers

### Infrastructure

- TanStack Start deployed to Cloudflare Workers
- Drizzle ORM + Turso (LibSQL)
- Cloudflare R2 for media
- Resend for transactional email
- Seed scripts: admin, students/parents, staff; reset + per-domain wipe scripts

---

## TODO — candidate features

Grouped by how self-contained each one is. None of these are planned commitments — they're conversation starters.

### Small / client-side

- ~~Sidebar default open/collapsed (preference)~~ ✅
- ~~Landing page after login (preference)~~ ✅
- ~~Command palette / global search (Cmd-K) across students, fees, events~~ ✅
- ~~Student photo thumbnail column in students list~~ ✅
- ~~Improved charts: tooltips, hover states, empty-state messaging~~ ✅

### Medium / needs server work

- **Fee templates** — define monthly tuition or term fees once, auto-generate per student
- **Bulk actions** — bulk mark attendance from a class roster, bulk fee creation
- **PDF receipts** — generate on payment, attach to email
- **Leave applications** — parent submits leave request → staff approves → flows into attendance
- **Announcements** — admin broadcasts to parents; shown in parent dashboard
- **Report cards / grades** — term-based grade entry + printable report
- **Timetable** — weekly class schedule beyond the calendar
- **Audit log** — role changes, deletions, fee edits (who/when)

### Larger / cross-cutting

- **Email/SMS notifications** — fee due reminders, low-attendance alerts, new submission pings (needs notification preferences + queue)
- **Homework / assignments tracker** — teacher posts, student/parent views submission status
- **Two-factor auth** + forgot-password / email-verification flows
- **Multi-language (i18n)** — at minimum English + Hindi toggle
- **Transport / bus routes** — pickup points, students per route, driver assignments
- **Library module** — books, borrowing, due dates
