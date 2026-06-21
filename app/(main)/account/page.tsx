import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { updateDisplayNameAction } from '@/lib/actions/profile'
import { AccountPrefsIsland } from './_components/AccountPrefsIsland'

export const metadata = { title: 'Account' }

// Account is session-specific — never statically prerendered at build time
export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ message?: string; error?: string }>
}

export default async function AccountPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // S7-F1: auth-gate — defense-in-depth; proxy also redirects anonymous requests
  if (!user) {
    redirect('/login?next=/account')
  }

  const { message, error } = await searchParams

  const [{ data: profile }, { data: prefs }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    supabase
      .from('notification_preferences')
      .select('mute_all, stream_standard, stream_pulse, stream_charts, stream_tech_vc, stream_geopolitics, stream_leadership')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const initialPrefs = prefs ?? {
    mute_all: false,
    stream_standard: true,
    stream_pulse: true,
    stream_charts: true,
    stream_tech_vc: true,
    stream_geopolitics: true,
    stream_leadership: true,
  }

  return (
    <div className="mx-auto max-w-lg py-10 space-y-10">
      <h1 className="text-2xl font-semibold text-primary">Account</h1>

      {message === 'name_updated' && (
        <div
          role="status"
          className="rounded-lg border border-success-border bg-success-soft px-4 py-3 text-sm text-success-fg"
        >
          Display name updated.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg"
        >
          {error === 'name_too_long'
            ? 'Display name must be 80 characters or fewer.'
            : 'Something went wrong. Please try again.'}
        </div>
      )}

      {/* Email — read-only per S7-F1 PMF scope */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide">Email</h2>
        <p className="text-sm text-primary">{user.email}</p>
      </section>

      {/* Display name */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide">Display name</h2>
        <form action={updateDisplayNameAction} className="flex gap-3">
          <input
            name="display_name"
            defaultValue={profile?.display_name ?? ''}
            maxLength={80}
            className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Your display name"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            Save
          </button>
        </form>
      </section>

      {/* Password */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide">Password</h2>
        <p className="text-sm text-muted">
          Request a reset email to change your password.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block text-sm text-accent hover:underline"
        >
          Send reset email →
        </Link>
      </section>

      {/* Notification preferences */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide">
          Notification preferences
        </h2>
        <AccountPrefsIsland initialPrefs={initialPrefs} />
      </section>
    </div>
  )
}
