import Link from 'next/link'
import { forgotPasswordAction } from '@/lib/actions/auth'

interface Props {
  searchParams: Promise<{ error?: string; message?: string }>
}

export const metadata = { title: 'Reset password — Nuggets' }

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { error, message } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="inline-block text-2xl font-semibold text-primary tracking-tight">
            Nuggets
          </Link>
          <p className="text-sm text-muted">Reset your password</p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg">
            {error === 'invalid_email' ? 'Please enter a valid email address.' : error}
          </div>
        )}

        {message === 'check_email' ? (
          <div role="status" className="rounded-lg border border-success-border bg-success-soft px-4 py-3 text-sm text-success-fg">
            Check your email for a password reset link.
          </div>
        ) : (
          <form action={forgotPasswordAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-primary">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              Send reset link
            </button>
          </form>
        )}

        <p className="text-center text-sm text-muted">
          <Link href="/login" className="text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
