import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HeaderSearch } from '@/components/layout/header-search'
import { HeaderAuth } from '@/components/layout/header-auth'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let initialUnreadCount = 0
  if (user) {
    const { count } = await supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
    initialUnreadCount = count ?? 0
  }

  return (
    <header className="w-full border-b border-border bg-bg/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 h-14 flex items-center gap-4">
        <Link href="/" className="font-semibold text-lg text-primary tracking-tight shrink-0">
          Nuggets
        </Link>

        <div className="flex-1 flex justify-center">
          <Suspense fallback={<div className="w-full max-w-xs sm:max-w-sm h-9 rounded-lg bg-surface-raised border border-border" />}>
            <HeaderSearch />
          </Suspense>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {user && (
            <NotificationPanel initialUnreadCount={initialUnreadCount} />
          )}
          <ThemeToggle />
          <HeaderAuth />
        </div>
      </div>
    </header>
  )
}
