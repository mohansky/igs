import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { admin } from 'better-auth/plugins'
import { createAccessControl } from 'better-auth/plugins/access'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '#/db'
import * as schema from '#/db/schema'

const statements = {
  dashboard: ['access'],
  users: ['list', 'create', 'update', 'delete'],
  classes: ['list', 'create', 'update', 'delete'],
  attendance: ['mark', 'view'],
  fees: ['create', 'view', 'record-payment'],
} as const

const ac = createAccessControl(statements)

// Fail fast on a missing secret rather than letting better-auth fall back to a
// weak/derived default, which would silently undermine session signing.
const authSecret = process.env.BETTER_AUTH_SECRET
if (!authSecret) {
  throw new Error(
    'BETTER_AUTH_SECRET is not set. Refusing to start auth with an insecure default.',
  )
}

export const auth = betterAuth({
  secret: authSecret,
  database: drizzleAdapter(db, { provider: 'sqlite', schema }),
  trustedOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://indogermanschool.com',
  ],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    tanstackStartCookies(),
    admin({
      defaultRole: 'student',
      ac,
      roles: {
        admin: ac.newRole({
          dashboard: ['access'],
          users: ['list', 'create', 'update', 'delete'],
          classes: ['list', 'create', 'update', 'delete'],
          attendance: ['mark', 'view'],
          fees: ['create', 'view', 'record-payment'],
        }),
        staff: ac.newRole({
          dashboard: ['access'],
          attendance: ['mark', 'view'],
          fees: ['create', 'view', 'record-payment'],
        }),
        student: ac.newRole({
          dashboard: ['access'],
          attendance: ['view'],
          fees: ['view'],
        }),
        // View-only role: read access across the dashboard (except user
        // management), no mutations.
        auditor: ac.newRole({
          dashboard: ['access'],
          classes: ['list'],
          attendance: ['view'],
          fees: ['view'],
        }),
      },
    }),
  ],
})
