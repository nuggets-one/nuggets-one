// S1-F3: server Header is deterministic static chrome — no cookies(), no auth reads.
// Auth-aware controls (create · theme · bell · avatar) live in HeaderRightUtilities (client island).
// Legal footer links for the account menu are fetched in `(main)/layout` and passed in
// so this component stays synchronous under NuqsAdapter (nuqs SSR + context).

import { Suspense } from 'react'
import Link from 'next/link'
import { HeaderSearch } from '@/components/layout/header-search'
import { HeaderRightUtilities } from '@/components/layout/header-right-utilities'
import type { LegalFooterLink } from '@/lib/queries/legal-pages'

/** Legal links are loaded in `(main)/layout` so this shell stays synchronous under `NuqsAdapter` (nuqs context + Next App Router SSR). */
export function Header({ legalLinks }: { legalLinks: LegalFooterLink[] }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-header backdrop-blur-sm">
      <div className="relative mx-auto h-14 max-w-[90rem] px-4 lg:px-6">
        <div className="grid h-full w-full grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[auto_1fr_auto]">
          <div className="col-start-1 flex min-w-0 shrink-0 items-center gap-2">
            <Link
              href="/"
              className="flex min-w-0 shrink-0 items-center gap-2 rounded-md outline-none ring-focus ring-offset-2 ring-offset-[var(--color-bg)] focus-visible:ring-2"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-[18.75%] bg-[#facc15] text-sm font-bold tracking-tighter text-[#111827] shadow-sm"
                style={{
                  fontFamily:
                    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
                aria-hidden="true"
              >
                N
              </span>
              <span className="hidden truncate text-lg font-semibold tracking-tight text-primary md:inline">
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

          <Suspense
            fallback={
              <>
                <div
                  className="col-start-2 flex shrink-0 items-center gap-1.5 sm:gap-2 md:col-start-3"
                  aria-hidden="true"
                >
                  <div className="size-11 animate-pulse rounded-lg bg-surface-raised md:hidden" />
                  <div className="h-9 w-16 rounded-lg bg-surface-raised animate-pulse" />
                </div>
                <div className="hidden md:col-start-2 md:flex md:justify-center md:px-4 lg:px-6">
                  <div className="h-9 w-full max-w-md rounded-lg border border-border bg-surface-raised lg:max-w-lg" />
                </div>
              </>
            }
          >
            <HeaderSearch utilities={<HeaderRightUtilities legalLinks={legalLinks} />} />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
