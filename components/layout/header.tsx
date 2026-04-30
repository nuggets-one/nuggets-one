import { Suspense } from 'react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { HeaderSearch } from '@/components/layout/header-search'
import { HeaderAuth } from '@/components/layout/header-auth'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export async function Header() {
  const cookieStore = await cookies()
  const hasSupabaseAuthCookie = cookieStore
    .getAll()
    .some(({ name }) => name.includes('-auth-token'))

  let user: { id: string; email: string | null } | null = null
  let initialUnreadCount = 0

  if (hasSupabaseAuthCookie) {
    const supabase = await createClient()
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser()
    user = sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? null } : null
  }

  if (user?.id) {
    const supabase = await createClient()
    const { count } = await supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    initialUnreadCount = count ?? 0
  }

  return (
    <header className="w-full border-b border-border bg-bg/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 lg:gap-4 lg:px-6">
        <Link href="/" className="font-semibold text-lg text-primary tracking-tight shrink-0">
          Nuggets
        </Link>

        <div className="flex-1 flex justify-center">
          <Suspense fallback={<div className="w-full max-w-xs sm:max-w-sm h-9 rounded-lg bg-surface-raised border border-border" />}>
            <HeaderSearch />
          </Suspense>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
          {user && (
            <NotificationPanel initialUnreadCount={initialUnreadCount} />
          )}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <HeaderAuth isAuthenticated={!!user} userEmail={user?.email} />
        </div>
      </div>
    </header>
  )
}
