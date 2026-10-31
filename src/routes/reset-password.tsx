import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { SITE_TITLE } from '#/lib/site'
import { authClient } from '#/lib/auth-client'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Card } from '#/components/ui/card'

// Keep in sync with emailAndPassword.minPasswordLength in #/lib/auth.
const MIN_PASSWORD_LENGTH = 10

// Better Auth's emailed link validates the token, then redirects here with
// ?token=... (valid) or ?error=INVALID_TOKEN (expired or already used).
export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Reset Password | ${SITE_TITLE}` },
      { name: 'robots', content: 'noindex, follow' },
    ],
  }),
  component: ResetPassword,
})

function ResetPassword() {
  const { token, error: linkError } = Route.useSearch()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token: token!,
      })
      if (result.error) {
        setError(
          result.error.message ??
            'This reset link is no longer valid. Please request a new one.',
        )
      } else {
        setDone(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-wrap flex min-h-[70vh] items-center justify-center py-12">
      <Card variant="glass" className="w-full max-w-sm p-8">
        <h1 className="display-title mb-2 text-center text-2xl">
          Reset password
        </h1>

        {linkError || !token ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-(--sea-ink-soft)">
              This reset link is invalid or has expired. Links work once, for
              1 hour.
            </p>
            <Link
              to="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Request a new link
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-(--sea-ink-soft)">
              Your password has been updated. You&apos;ve been signed out on
              other devices.
            </p>
            <Link to="/sign-in">
              <Button className="w-full">Sign in</Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-center text-sm text-(--sea-ink-soft)">
              Choose a new password (at least {MIN_PASSWORD_LENGTH} characters).
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Saving...' : 'Set new password'}
              </Button>
            </form>
          </>
        )}
      </Card>
    </main>
  )
}
