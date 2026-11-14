export type RoleVariant = 'destructive' | 'warning' | 'success' | 'secondary'

export type UserRole = 'admin' | 'staff' | 'student' | 'auditor'

export function getRoleVariant(role: string | null | undefined): RoleVariant {
  switch (role) {
    case 'admin':
      return 'destructive'
    case 'staff':
      return 'warning'
    case 'student':
      return 'success'
    case 'auditor':
      return 'secondary'
    default:
      return 'secondary'
  }
}

// Routes the view-only auditor cannot open: user management, add/upload
// pages, and the staff-personal "My ..." pages (no data for an auditor).
// The sidebar, the command palette and the route guards all read this one
// set -- keep them in step by editing it here only.
export const AUDITOR_HIDDEN_ROUTES: ReadonlySet<string> = new Set([
  '/dashboard/users',
  '/dashboard/my-attendance',
  '/dashboard/my-salaries',
  '/dashboard/gallery',
  '/dashboard/fee-categories',
  '/dashboard/staff/new',
  '/dashboard/students/new',
])
