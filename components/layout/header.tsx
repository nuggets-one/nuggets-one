import { Suspense } from 'react'
import Link from 'next/link'
import { HeaderSearch } from '@/components/layout/header-search'

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bg/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 h-14 flex items-center gap-4">
        <Link href="/" className="font-semibold text-lg text-primary tracking-tight shrink-0">
          Nuggets
        </Link>

        <div className="flex-1 flex justify-center">
          <Suspense fallback={<div className="w-full max-w-xs sm:max-w-sm h-9 rounded-lg bg-surface-raised border border-border" />}>
            <HeaderSearch />
          </Suspense>
        </div>

        {/* Auth placeholder — replaced in PR-12 */}
        <Link
          href="/login"
          className="shrink-0 text-sm text-muted hover:text-primary transition-colors"
        >
          Sign in
        </Link>
      </div>
    </header>
  )
}
