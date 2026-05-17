'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

function pathActive(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`)
}

type NavItemId = 'nuggets' | 'pulse' | 'collections' | 'bookmarks'

type NavItem = {
  id: NavItemId
  label: string
  href: string
  scroll?: false
}

const NAV_ITEMS: NavItem[] = [
  { id: 'nuggets', label: 'Nuggets', href: '/?stream=standard', scroll: false },
  { id: 'pulse', label: 'Pulse', href: '/?stream=pulse', scroll: false },
  { id: 'collections', label: 'Collections', href: '/collections' },
  { id: 'bookmarks', label: 'Bookmarks', href: '/bookmarks' },
]

function isItemActive(
  id: NavItemId,
  pathname: string,
  stream: string | null,
): boolean {
  const onHome = pathname === '/'
  switch (id) {
    case 'nuggets':
      return onHome && stream !== 'pulse'
    case 'pulse':
      return onHome && stream === 'pulse'
    case 'collections':
      return pathActive(pathname, '/collections')
    case 'bookmarks':
      return pathActive(pathname, '/bookmarks')
  }
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const stream = searchParams.get('stream')

  const linkClass = (active: boolean) =>
    `flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center px-1.5 pb-2 pt-[10px] text-center text-xs font-semibold leading-tight tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 ${
      active
        ? 'border-t-[3px] border-accent bg-rail text-primary'
        : 'border-t-[3px] border-transparent text-muted hover:text-primary'
    }`

  return (
    <nav
      aria-label="Mobile"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border bg-header pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-[1800px] items-stretch">
        {NAV_ITEMS.map(({ id, label, href, scroll }) => {
          const active = isItemActive(id, pathname, stream)
          return (
            <Link
              key={id}
              href={href}
              {...(scroll === false ? { scroll: false } : {})}
              aria-current={active ? 'page' : undefined}
              className={linkClass(active)}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
