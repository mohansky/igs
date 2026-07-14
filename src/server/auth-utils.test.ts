import { describe, expect, it, vi, beforeEach } from 'vitest'

// requireRole pulls in #/lib/auth (better-auth + drizzle + a hard fail on a
// missing BETTER_AUTH_SECRET), so both boundaries are mocked out.
const getSession = vi.fn()
const getRequest = vi.fn()

vi.mock('#/lib/auth', () => ({
  auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } },
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => getRequest(),
}))

const { requireAuth, requireRole } = await import('./auth-utils')

/** Pretend the current request is `method` from a user with `role`. */
function given(role: string | null, method: 'GET' | 'POST' = 'GET') {
  getRequest.mockReturnValue({ method, headers: new Headers() })
  getSession.mockResolvedValue(
    role === null ? null : { user: { id: 'u1', role } },
  )
}

beforeEach(() => {
  getSession.mockReset()
  getRequest.mockReset()
})

describe('requireAuth', () => {
  it('rejects an anonymous request', async () => {
    given(null)
    await expect(requireAuth()).rejects.toThrow('Unauthorized')
  })

  it('returns the session for any signed-in role', async () => {
    given('student')
    await expect(requireAuth()).resolves.toMatchObject({
      user: { id: 'u1', role: 'student' },
    })
  })
})

describe('requireRole', () => {
  it('rejects an anonymous request', async () => {
    given(null)
    await expect(requireRole(['admin'])).rejects.toThrow('Unauthorized')
  })

  it('allows a role that is explicitly listed', async () => {
    given('admin')
    await expect(requireRole(['admin'])).resolves.toBeTruthy()
  })

  it('rejects a role that is not listed', async () => {
    given('student')
    await expect(requireRole(['admin'])).rejects.toThrow('Forbidden')
  })

  it('rejects staff from an admin-only endpoint', async () => {
    given('staff', 'POST')
    await expect(requireRole(['admin'])).rejects.toThrow('Forbidden')
  })

  it('treats a user with no role at all as a student', async () => {
    const asRolelessUser = () => {
      getRequest.mockReturnValue({ method: 'GET', headers: new Headers() })
      getSession.mockResolvedValue({ user: { id: 'u1' } }) // no `role` field
    }

    asRolelessUser()
    await expect(requireRole(['student'])).resolves.toBeTruthy()

    asRolelessUser()
    await expect(requireRole(['admin'])).rejects.toThrow('Forbidden')
  })

  // The `?? 'student'` fallback only catches null/undefined. An empty-string
  // role matches nothing and is denied — fail closed, which is what we want.
  it('denies an empty-string role rather than defaulting it', async () => {
    given('')
    await expect(requireRole(['student'])).rejects.toThrow('Forbidden')
  })
})

// The auditor is a view-only role. Its read access is granted by HTTP method:
// any GET is allowed, every POST (i.e. every mutation) is denied.
describe('requireRole — auditor (view-only)', () => {
  it('can read any GET endpoint, even one it is not listed on', async () => {
    given('auditor', 'GET')
    await expect(requireRole(['admin'])).resolves.toBeTruthy()
  })

  it('CANNOT write: every POST endpoint is denied', async () => {
    given('auditor', 'POST')
    await expect(requireRole(['admin'])).rejects.toThrow('Forbidden')

    given('auditor', 'POST')
    await expect(requireRole(['admin', 'staff'])).rejects.toThrow('Forbidden')
  })

  it('is excluded from user management even on a GET', async () => {
    given('auditor', 'GET')
    await expect(
      requireRole(['admin'], { allowAuditor: false }),
    ).rejects.toThrow('Forbidden')
  })

  it('still passes an endpoint that lists it explicitly', async () => {
    given('auditor', 'POST')
    await expect(requireRole(['auditor'])).resolves.toBeTruthy()
  })
})
