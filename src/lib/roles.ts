export type RoleVariant = 'destructive' | 'warning' | 'success' | 'secondary'

export function getRoleVariant(role: string | null | undefined): RoleVariant {
  switch (role) {
    case 'admin':
      return 'destructive'
    case 'staff':
      return 'warning'
    case 'student':
      return 'success'
    default:
      return 'secondary'
  }
}
