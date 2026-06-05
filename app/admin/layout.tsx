import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getPushHealthSnapshot } from '@/lib/notifications/push-health'

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
    <div className="min-h-screen bg-bg">
      {pushHealthBanner && (
        <div
          role="status"
          className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-2 text-sm text-amber-900 dark:text-amber-100"
        >
          {pushHealthBanner}
        </div>
      )}
      <nav className="flex h-12 items-center gap-6 border-b border-border bg-header px-6 backdrop-blur-sm">
        <span className="font-semibold text-sm text-primary">Admin</span>
        <Link href="/admin/articles" className="text-sm text-muted hover:text-primary transition-colors">Articles</Link>
        <Link href="/admin/tags" className="text-sm text-muted hover:text-primary transition-colors">Tags</Link>
        <Link href="/admin/collections" className="text-sm text-muted hover:text-primary transition-colors">Collections</Link>
        <Link href="/admin/legal-pages" className="text-sm text-muted hover:text-primary transition-colors">Legal pages</Link>
        <Link href="/admin/site-copy" className="text-sm text-muted hover:text-primary transition-colors">Site copy</Link>
        <Link
          href="/admin/articles/new"
          className="text-sm text-muted hover:text-primary transition-colors"
        >
          Create nugget
        </Link>
        <Link href="/" className="ml-auto text-sm text-muted hover:text-primary transition-colors">← Site</Link>
      </nav>
      <main className="mx-auto w-full max-w-screen-2xl px-6 py-6">
        {children}
      </main>
    </div>
  )
}
