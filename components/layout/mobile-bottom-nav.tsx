'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

function pathActive(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`)
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const stream = searchParams.get('stream')

  const onHome = pathname === '/'
  const nuggetsActive = onHome && stream !== 'pulse'
  const pulseActive = onHome && stream === 'pulse'
  const collectionsActive = pathActive(pathname, '/collections')
  const bookmarksActive = pathActive(pathname, '/bookmarks')

  const cls = (active: boolean) =>
    `flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center px-1.5 pb-2 pt-[10px] text-center text-xs font-semibold leading-tight tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 ${
      active ? 'border-t-[3px] border-accent bg-rail text-primary' : 'border-t-[3px] border-transparent text-muted hover:text-primary'
    }`

  return (
    <nav
      aria-label="Mobile"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border bg-header pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-[1800px] items-stretch">
        <Link href="/?stream=standard" scroll={false} className={cls(nuggetsActive)}>
          Nuggets
        </Link>
        <Link href="/?stream=pulse" scroll={false} className={cls(pulseActive)}>
          Pulse
        </Link>
        <Link href="/collections" className={cls(collectionsActive)}>
          Collections
        </Link>
        <Link href="/bookmarks" className={cls(bookmarksActive)}>
          Bookmarks
        </Link>
      </div>
    </nav>
  )
}
