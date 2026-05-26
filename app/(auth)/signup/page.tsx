import Link from 'next/link'
import { signupAction } from '@/lib/actions/auth'

interface Props {
  searchParams: Promise<{ error?: string; next?: string }>
}

export const metadata = { title: 'Sign up' }

export default async function SignupPage({ searchParams }: Props) {
  const { error, next } = await searchParams
  const nextPath = next ?? '/'
  const nextQuery = nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''
  const googleHref = nextPath !== '/' ? `/auth/google?next=${encodeURIComponent(nextPath)}` : '/auth/google'

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="inline-block text-2xl font-semibold text-primary tracking-tight">
            Nuggets
          </Link>
          <p className="text-sm text-muted">Create your account</p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg">
            {error === 'invalid_data' ? 'Please check your details and try again.' : error}
          </div>
        )}

        <form action={signupAction} className="space-y-4">
          <input type="hidden" name="next" value={nextPath} />

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

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-primary">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Min. 8 characters"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            Create account
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-bg px-2 text-muted">or</span>
          </div>
        </div>

        <Link
          href={googleHref}
          className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm font-medium text-primary hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          <GoogleIcon />
          Continue with Google
        </Link>

        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href={`/login${nextQuery}`} className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.67 3.67 0 0 1-1.6 2.41v2h2.58c1.51-1.39 2.4-3.44 2.4-5.87z" fill="var(--color-google-blue)" />
      <path d="M8 16c2.16 0 3.97-.71 5.3-1.93l-2.58-2a4.77 4.77 0 0 1-7.1-2.5H.97v2.07C2.3 14.17 4.96 16 8 16z" fill="var(--color-google-green)" />
      <path d="M3.62 9.57A4.8 4.8 0 0 1 3.37 8c0-.55.1-1.08.25-1.57V4.36H.97A8 8 0 0 0 0 8c0 1.29.31 2.51.97 3.64l2.65-2.07z" fill="var(--color-google-yellow)" />
      <path d="M8 3.18c1.22 0 2.3.42 3.16 1.24l2.36-2.36A8 8 0 0 0 8 0C4.96 0 2.3 1.83.97 4.36L3.62 6.43A4.77 4.77 0 0 1 8 3.18z" fill="var(--color-google-red)" />
    </svg>
  )
}
