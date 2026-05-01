// S1-F3: server Header is deterministic static chrome — no cookies(), no auth reads.
// Auth-aware controls (bell, avatar, sign-in) live in HeaderAuthIsland (client island).
// This keeps the (main) layout out of the dynamic rendering path for anonymous users.

import { Suspense } from 'react'
import Link from 'next/link'
import { HeaderSearch } from '@/components/layout/header-search'
import { HeaderAuthIsland } from '@/components/layout/header-auth-island'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const MAIN_NAV_LINK_CLASS =
  'inline-flex min-h-[44px] items-center whitespace-nowrap rounded-md px-2 text-sm font-medium text-muted transition-colors hover:text-primary hover:bg-surface-raised active:bg-surface-raised'

export function Header() {
  return (
    <header className="w-full border-b border-border bg-bg/80 backdrop-blur-sm">
      <div className="mx-auto flex h-auto min-h-14 max-w-[90rem] flex-wrap items-center gap-y-3 px-4 py-2 lg:flex-nowrap lg:gap-x-4 lg:px-6 lg:py-0">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4 lg:flex-initial lg:shrink-0">
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-2 rounded-md outline-none ring-focus ring-offset-2 ring-offset-[var(--color-bg)] focus-visible:ring-2"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent font-extrabold text-black text-sm tracking-tighter shadow-sm"
              aria-hidden="true"
            >
              N
            </span>
            <span className="truncate text-lg font-semibold tracking-tight text-primary">
              Nuggets
            </span>
          </Link>

          <nav className="hidden md:flex md:items-center md:gap-1" aria-label="Primary">
            <Link href="/" className={MAIN_NAV_LINK_CLASS}>
              Home
            </Link>
            <Link href="/collections" className={MAIN_NAV_LINK_CLASS}>
              Collections
            </Link>
            <Link href="/admin/articles/new" className={MAIN_NAV_LINK_CLASS}>
              Create nugget
            </Link>
          </nav>
        </div>

        <div className="order-last w-full lg:order-none lg:flex-1 lg:px-6">
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

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2 lg:min-w-fit">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <HeaderAuthIsland />
        </div>

        {/* Mobile compact nav */}
        <nav
          className="flex w-full items-center gap-1 overflow-x-auto border-t border-border/60 pt-2 md:hidden [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
          aria-label="Primary"
        >
          <Link href="/" className={`${MAIN_NAV_LINK_CLASS} shrink-0`}>
            Home
          </Link>
          <Link href="/collections" className={`${MAIN_NAV_LINK_CLASS} shrink-0`}>
            Collections
          </Link>
          <Link href="/admin/articles/new" className={`${MAIN_NAV_LINK_CLASS} shrink-0`}>
            Create nugget
          </Link>
        </nav>
      </div>
    </header>
  )
}
