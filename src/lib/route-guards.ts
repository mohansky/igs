import { redirect, useRouteContext } from '@tanstack/react-router'
import type { UserRole } from './roles'

// The session a dashboard route receives from its parent's beforeLoad.
interface GuardContext {
  session: { user: unknown }
}

export function routeRole(context: GuardContext): UserRole {
  return ((context.session.user as { role?: string }).role ??
    'student') as UserRole
}

// beforeLoad guard: redirect to the dashboard home unless the user's role
// is allowed. The view-only auditor passes by default, mirroring
// requireRole on the server (which lets auditors through every GET and
// rejects every write from them); pass allowAuditor: false for pages that
// only exist to edit (user management, add forms, uploads).
export function requireRouteRole(
  context: GuardContext,
  roles: UserRole[],
  { allowAuditor = true }: { allowAuditor?: boolean } = {},
): UserRole {
  const role = routeRole(context)
  if (roles.includes(role) || (allowAuditor && role === 'auditor')) {
    return role
  }
  throw redirect({ to: '/dashboard' })
}

// For page components: true when the signed-in user is the view-only
// auditor, so pages they can open hide their add/edit/delete controls.
// (The server rejects auditor writes anyway; this is UX, not security.)
export function useIsAuditor(): boolean {
  const { session } = useRouteContext({ from: '/dashboard' })
  return (session.user as { role?: string }).role === 'auditor'
}
