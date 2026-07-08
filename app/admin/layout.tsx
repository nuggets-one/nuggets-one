import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPushHealthSnapshot } from '@/lib/notifications/push-health'
import { AdminNav } from '@/app/admin/_components/admin-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Per admin CLAUDE.md: always call getUser() — never trust session alone.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.app_metadata?.is_admin !== true) {
    redirect('/')
  }

  let pushHealthBanner: string | null = null
  try {
    const health = await getPushHealthSnapshot()
    if (!health.configured) {
      pushHealthBanner =
        'Push is misconfigured: FCM_SERVICE_ACCOUNT_JSON is missing. Outbox rows will accumulate without delivery.'
    } else if (health.status === 'degraded') {
      pushHealthBanner = `Push backlog is elevated (${health.total_backlog} pending items). Check /api/health/push or run a manual drain.`
    }
  } catch {
    pushHealthBanner = 'Could not load push health status.'
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-bg"
      data-admin-push-banner={pushHealthBanner ? 'true' : undefined}
    >
      {pushHealthBanner && (
        <div
          role="status"
          className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-900 sm:px-6 dark:text-amber-100"
        >
          {pushHealthBanner}
        </div>
      )}
      <AdminNav />
      <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  )
}
