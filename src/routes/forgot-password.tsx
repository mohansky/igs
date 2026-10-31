import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { SITE_TITLE } from '#/lib/site'
import { authClient } from '#/lib/auth-client'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Card } from '#/components/ui/card'

export const Route = createFileRoute('/forgot-password')({
  head: () => ({
    meta: [
      { title: `Forgot Password | ${SITE_TITLE}` },
      { name: 'robots', content: 'noindex, follow' },
    ],
  }),
  component: ForgotPassword,
})

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (result.error) {
        setError(
          result.error.status === 429
            ? 'Too many attempts. Please wait a minute and try again.'
            : 'Something went wrong. Please try again.',
        )
      } else {
        setSent(true)
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
          Forgot password
        </h1>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-(--sea-ink-soft)">
              If an account exists for <strong>{email}</strong>, we&apos;ve
              sent a link to reset your password. It expires in 1 hour. Check
              your spam folder if you don&apos;t see it.
            </p>
            <Link to="/sign-in" className="text-sm text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-center text-sm text-(--sea-ink-soft)">
              Enter your login email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
            <p className="mt-6 text-center text-xs text-(--sea-ink-soft)">
              No email on your account? Ask the school office to reset your
              password.
            </p>
            <p className="mt-2 text-center">
              <Link
                to="/sign-in"
                className="text-sm text-primary hover:underline"
              >
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </Card>
    </main>
  )
}
