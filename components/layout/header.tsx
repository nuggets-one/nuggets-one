// S1-F3: server Header is deterministic static chrome — no cookies(), no auth reads.
// Auth-aware controls (bell, avatar, sign-in) live in HeaderAuthIsland (client island).
// This keeps the (main) layout out of the dynamic rendering path for anonymous users.

import { Suspense } from 'react'
import Link from 'next/link'
import { HeaderSearch } from '@/components/layout/header-search'
import { HeaderAuthIsland } from '@/components/layout/header-auth-island'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-header backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-2 rounded-md outline-none ring-focus ring-offset-2 ring-offset-[var(--color-bg)] focus-visible:ring-2"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent font-extrabold text-accent-foreground text-sm tracking-tighter shadow-sm"
              aria-hidden="true"
            >
              N
            </span>
            <span className="truncate text-lg font-semibold tracking-tight text-primary">
              Nuggets
            </span>
          </Link>

          <nav
            aria-label="Library"
            className="hidden min-w-0 shrink-0 items-center gap-0.5 border-l border-border pl-3 lg:flex"
          >
            <Link
              href="/bookmarks"
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-raised hover:text-primary"
            >
              Bookmarks
            </Link>
            <Link
              href="/collections"
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-raised hover:text-primary"
            >
              Collections
            </Link>
          </nav>
        </div>

        <div className="min-w-0 flex-1 px-2 sm:px-4 lg:px-6">
          <Suspense
            fallback={
              <div className="mx-auto h-9 w-full max-w-md rounded-lg border border-border bg-surface-raised" />
            }
          >
            <div className="mx-auto w-full max-w-md lg:max-w-lg">
              <HeaderSearch />
            </div>
          </Suspense>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          <ThemeToggle />
          <HeaderAuthIsland />
        </div>
      </div>
    </header>
  )
}
