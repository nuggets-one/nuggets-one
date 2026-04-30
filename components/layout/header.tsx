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
    <header className="w-full border-b border-border bg-bg/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 lg:gap-4 lg:px-6">
        <Link href="/" className="font-semibold text-lg text-primary tracking-tight shrink-0">
          Nuggets
        </Link>

        <div className="flex-1 flex justify-center">
          <Suspense
            fallback={
              <div className="w-full max-w-xs sm:max-w-sm h-9 rounded-lg bg-surface-raised border border-border" />
            }
          >
            <HeaderSearch />
          </Suspense>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <HeaderAuthIsland />
        </div>
      </div>
    </header>
  )
}
