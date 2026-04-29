'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { logoutAction } from '@/lib/actions/auth'

export function HeaderAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Match SSR anonymous output during hydration to avoid mismatch
  if (loading) {
    return (
      <span className="shrink-0 text-sm text-muted">Sign in</span>
    )
  }

  if (!user) {
    return (
      <Link
        href={`/login${pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : ''}`}
        className="shrink-0 text-sm text-muted hover:text-primary transition-colors"
      >
        Sign in
      </Link>
    )
  }

  // Authenticated state — minimal avatar + logout
  // Bell/notifications added in later PR (§6.6)
  const initials = (user.email ?? 'U').charAt(0).toUpperCase()

  return (
    <div className="shrink-0 flex items-center gap-3">
      <form action={logoutAction}>
        <button
          type="submit"
          className="text-sm text-muted hover:text-primary transition-colors"
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
