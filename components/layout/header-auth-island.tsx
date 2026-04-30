'use client'

// S1-F3: thin client island for auth-aware header controls.
// The server Header component is cookie-free; auth state is determined here
// on the client so the (main) layout can be statically rendered.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { logoutAction } from '@/lib/actions/auth'

// S2-F5: lazy-load the notification panel — must not block / first-byte path
const NotificationPanel = dynamic(
  () =>
    import('@/components/notifications/NotificationPanel').then((m) => ({
      default: m.NotificationPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-9 h-9 rounded-lg bg-surface-raised animate-pulse" aria-hidden="true" />
    ),
  }
)

type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; email: string | null }

export function HeaderAuthIsland() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuth({ status: 'authenticated', email: session.user.email ?? null })
      } else {
        setAuth({ status: 'anonymous' })
      }
    })
  }, [])

  if (auth.status === 'loading') {
    return (
      <div
        className="h-8 w-16 rounded-lg bg-surface-raised animate-pulse"
        aria-hidden="true"
      />
    )
  }

  if (auth.status === 'anonymous') {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-[44px] items-center rounded-md px-2 text-sm text-muted transition-colors hover:text-primary active:bg-surface-raised"
      >
        Sign in
      </Link>
    )
  }

  const initials = (auth.email ?? 'U').charAt(0).toUpperCase()

  return (
    <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
      <NotificationPanel />
      <form action={logoutAction} className="hidden md:block">
        <button
          type="submit"
          className="inline-flex min-h-[44px] items-center rounded-md px-2 text-sm text-muted transition-colors hover:text-primary active:bg-surface-raised"
        >
          Sign out
        </button>
      </form>
      <Link
        href="/account"
        aria-label="Account settings"
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent text-white text-xs font-semibold select-none hover:bg-accent/90 transition-colors"
      >
        {initials}
      </Link>
    </div>
  )
}
