import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { updateDisplayNameAction } from '@/lib/actions/profile'
import { AccountPrefsIsland } from './_components/AccountPrefsIsland'

export const metadata = { title: 'Account — Nuggets' }

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
      .select('mute_all, stream_standard, stream_pulse')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const initialPrefs = prefs ?? {
    mute_all: false,
    stream_standard: true,
    stream_pulse: true,
  }

  return (
    <div className="mx-auto max-w-lg py-10 space-y-10">
      <h1 className="text-2xl font-semibold text-primary">Account</h1>

      {message === 'name_updated' && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20 px-4 py-3 text-sm text-green-700 dark:text-green-400"
        >
          Display name updated.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400"
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
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
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
