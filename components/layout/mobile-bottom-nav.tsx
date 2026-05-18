'use client'

import clsx from 'clsx'
import { Activity, Bookmark, House, Layers, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQueryState } from 'nuqs'
import { useEffect, useState } from 'react'
import { DEFAULT_STREAM, type ContentStream } from '@/types/article'

function pathActive(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`)
}

type NavItemId = 'nuggets' | 'pulse' | 'collections' | 'bookmarks'

type NavItem = {
  id: NavItemId
  label: string
  href: string
  icon: LucideIcon
  scroll?: false
  compactLabel?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'nuggets', label: 'Nuggets', href: '/?stream=standard', icon: House, scroll: false },
  { id: 'pulse', label: 'Market Pulse', href: '/?stream=pulse', icon: Activity, scroll: false, compactLabel: true },
  { id: 'collections', label: 'Collections', href: '/collections', icon: Layers },
  { id: 'bookmarks', label: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
]

function isItemActive(
  id: NavItemId,
  pathname: string,
  stream: ContentStream,
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
  const pathname = usePathname() ?? ''
  const [stream] = useQueryState<ContentStream>('stream', {
    defaultValue: DEFAULT_STREAM,
    parse: (v): ContentStream => (v === 'pulse' ? 'pulse' : 'standard'),
    shallow: true,
  })
  // Active tab uses pathname + stream; defer until mount so SSR and the first
  // client paint match (usePathname / URL state can differ during hydration).
  const [navReady, setNavReady] = useState(false)
  useEffect(() => {
    setNavReady(true)
  }, [])

  return (
    <nav
      role="navigation"
      aria-label="Primary destinations"
      className="fixed bottom-0 left-0 right-0 z-[75] border-t border-border bg-header/95 pb-[max(env(safe-area-inset-bottom),0px)] shadow-[0_-8px_20px_-16px_rgba(15,23,42,0.35)] backdrop-blur-lg transition-[transform,opacity] duration-300 ease-out lg:hidden dark:shadow-black/40"
    >
      <div className="grid min-h-[64px] grid-cols-4 items-stretch px-2 pb-1 pt-1">
        {NAV_ITEMS.map(({ id, label, href, icon: Icon, scroll, compactLabel }) => {
          const active = navReady && isItemActive(id, pathname, stream)
          return (
            <Link
              key={id}
              href={href}
              {...(scroll === false ? { scroll: false } : {})}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'relative flex min-h-[58px] flex-col items-center justify-center rounded-xl px-1.5 py-1.5 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
                active
                  ? 'bg-accent-soft text-accent-foreground'
                  : 'text-muted hover:bg-rail hover:text-primary',
              )}
            >
              <span
                className={clsx(
                  'mb-0.5 inline-flex items-center justify-center',
                  active ? 'text-accent' : 'text-muted',
                )}
                aria-hidden
              >
                <Icon size={19} strokeWidth={active ? 2.3 : 2.1} aria-hidden />
              </span>
              <span
                className={clsx(
                  'leading-tight tracking-[0.01em]',
                  compactLabel ? 'text-[10.5px]' : 'text-[11px]',
                  active ? 'font-semibold' : 'font-medium',
                )}
              >
                {label}
              </span>
              <span
                className={clsx(
                  'absolute inset-x-4 top-0.5 h-[2px] rounded-full bg-accent transition-opacity duration-200',
                  active ? 'opacity-100' : 'opacity-0',
                )}
                aria-hidden
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
