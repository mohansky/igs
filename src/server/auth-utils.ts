import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'

// Require any authenticated session, regardless of role.
export async function requireAuth() {
  const request = getRequest()
  const session = await auth.api.getSession({
    headers: request.headers,
  })
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireRole(
  roles: string[],
  opts: { allowAuditor?: boolean } = {},
) {
  const { allowAuditor = true } = opts
  const session = await requireAuth()
  const userRole = (session.user as { role?: string }).role ?? 'student'
  if (roles.includes(userRole)) {
    return session
  }
  // The auditor is a view-only role: it may read any GET (read) endpoint across
  // the dashboard, but never mutate. POST endpoints fall through to Forbidden.
  // `allowAuditor: false` opts an endpoint out (e.g. user management).
  if (allowAuditor && userRole === 'auditor' && getRequest().method === 'GET') {
    return session
  }
  throw new Error('Forbidden')
}
