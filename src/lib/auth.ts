import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { admin } from 'better-auth/plugins'
import { createAccessControl } from 'better-auth/plugins/access'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '#/db'
import * as schema from '#/db/schema'
import { isPlaceholderEmail } from '#/lib/email'

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
    'https://www.indogermanschool.com',
  ],
  emailAndPassword: {
    enabled: true,
    // Accounts are created by an admin (see createUserByAdmin). Leaving this
    // off would expose a live public /api/auth/sign-up/email endpoint.
    disableSignUp: true,
    minPasswordLength: 10,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour — the email says so
    // A reset should lock out whoever had the old password, not just change it.
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      // Staff created without an email get a placeholder address — no inbox.
      if (isPlaceholderEmail(user.email)) return
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) {
        console.error('RESEND_API_KEY is not set; password reset email not sent.')
        return
      }
      // Loaded on demand: auth runs on every request, and Resend + react-email
      // would otherwise add ~490 kB to the main server bundle.
      const [{ Resend }, { ResetPasswordEmail }] = await Promise.all([
        import('resend'),
        import('#/emails/reset-password'),
      ])
      const { error } = await new Resend(apiKey).emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ?? 'IGS <noreply@indo-german.school>',
        to: user.email,
        subject: 'Reset your Indo-German School password',
        react: ResetPasswordEmail({ name: user.name, url }),
      })
      if (error) console.error('Failed to send password reset email:', error)
    },
  },
  // Throttle sign-in attempts. Without this, /sign-in/email is an unthrottled
  // oracle for credential stuffing / brute force.
  rateLimit: {
    enabled: true,
    // Workers isolates don't share memory, so the default in-memory storage
    // would only throttle per-isolate. Backed by the `rate_limit` table.
    storage: 'database',
    window: 60,
    max: 30,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      // The real endpoint name in better-auth 1.5 (was /forget-password).
      '/request-password-reset': { window: 60, max: 3 },
      '/reset-password': { window: 60, max: 5 },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh the expiry at most once a day
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
