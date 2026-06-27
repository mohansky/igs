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
