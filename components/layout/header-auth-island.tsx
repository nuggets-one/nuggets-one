'use client'

// S1-F3: thin client island for auth-aware header controls.
// The server Header component is cookie-free; auth state is determined here
// on the client so the (main) layout can be statically rendered.

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
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
      <div className="h-9 w-9 rounded-lg bg-surface-raised animate-pulse" aria-hidden="true" />
    ),
  }
)

type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; email: string | null; isAdmin: boolean }

function MenuHeading({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
      {children}
    </p>
  )
}

export function HeaderAuthIsland() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    fetch('/api/auth/status', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then(
        (data: {
          authenticated?: boolean
          email?: string | null
          isAdmin?: boolean
        }) => {
        if (cancelled) return
        if (data.authenticated) {
          setAuth({
            status: 'authenticated',
            email: data.email ?? null,
            isAdmin: data.isAdmin === true,
          })
        } else {
          setAuth({ status: 'anonymous' })
        }
      })
      .catch(() => {
        if (!cancelled) setAuth({ status: 'anonymous' })
      })

    return () => {
      cancelled = true
    }
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
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <NotificationPanel />
      <details className="group relative">
        <summary
          aria-label="Open account menu"
          className="list-none [&::-webkit-details-marker]:hidden inline-flex cursor-pointer items-center outline-none [&:-moz-focusring]:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 rounded-full"
        >
          <span className="inline-flex size-9 select-none items-center justify-center rounded-full bg-accent text-xs font-semibold text-white transition-colors hover:bg-accent/90 active:bg-accent/80">
            {initials}
          </span>
        </summary>

        <div
          role="menu"
          className="absolute right-0 top-full z-[70] mt-2 w-56 rounded-xl border border-border bg-surface py-2 shadow-lg ring-1 ring-black/5 dark:bg-surface-raised dark:ring-white/10"
        >
          {auth.email && (
            <>
              <MenuHeading>Signed in as</MenuHeading>
              <p className="-mt-2 px-3 pb-2 text-xs text-muted line-clamp-2 break-all">
                {auth.email}
              </p>
            </>
          )}

          <Link
            href="/bookmarks"
            role="menuitem"
            className="block px-3 py-2 text-sm font-medium text-primary hover:bg-surface-raised"
          >
            Bookmarks
          </Link>

          <Link
            href="/collections"
            role="menuitem"
            className="block px-3 py-2 text-sm font-medium text-primary hover:bg-surface-raised"
          >
            Collections
          </Link>

          {auth.isAdmin ? (
            <>
              <Link
                href="/admin/articles"
                role="menuitem"
                className="block px-3 py-2 text-sm font-medium text-primary hover:bg-surface-raised"
              >
                Admin
              </Link>
              <Link
                href="/admin/articles/new"
                role="menuitem"
                className="block px-3 py-2 text-sm font-medium text-primary hover:bg-surface-raised"
              >
                Create nugget
              </Link>
            </>
          ) : null}

          <div className="my-2 border-t border-border" />

          <MenuHeading>Legal</MenuHeading>
          <Link
            href="/legal/terms"
            role="menuitem"
            className="block px-3 py-2 text-sm font-medium text-primary hover:bg-surface-raised"
          >
            Terms of use
          </Link>
          <Link
            href="/legal/privacy"
            role="menuitem"
            className="block px-3 py-2 text-sm font-medium text-primary hover:bg-surface-raised"
          >
            Privacy policy
          </Link>

          <div className="my-2 border-t border-border" />

          <form action={logoutAction} role="presentation">
            <button
              type="submit"
              role="menuitem"
              className="w-full px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-raised hover:text-primary"
            >
              Sign out
            </button>
          </form>
        </div>
      </details>
    </div>
  )
}
