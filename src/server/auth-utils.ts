import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'

export async function requireRole(roles: string[]) {
  const request = getRequest()
  const session = await auth.api.getSession({
    headers: request.headers,
  })
  if (!session) {
    throw new Error('Unauthorized')
  }
  const userRole = (session.user as { role?: string }).role ?? 'student'
  if (!roles.includes(userRole)) {
    throw new Error('Forbidden')
  }
  return session
}
