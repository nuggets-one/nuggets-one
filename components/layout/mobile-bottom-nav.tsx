'use client'

import clsx from 'clsx'
import { Activity, Bookmark, House, Layers, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQueryState } from 'nuqs'
import { useMemo, useSyncExternalStore } from 'react'
import { useAuthStatus } from '@/components/layout/auth-status-provider'
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
}

const NAV_ITEMS: NavItem[] = [
  { id: 'nuggets', label: 'Nuggets', href: '/?stream=standard', icon: House },
  { id: 'pulse', label: 'Market Pulse', href: '/?stream=pulse', icon: Activity },
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
  const auth = useAuthStatus()
  // Active tab uses pathname + stream; defer until mount so SSR and the first
  // client paint match (usePathname / URL state can differ during hydration).
  const navReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const visibleItems = useMemo(
    () =>
      auth.status === 'authenticated'
        ? NAV_ITEMS
        : NAV_ITEMS.filter((item) => item.id !== 'bookmarks'),
    [auth.status],
  )

  return (
    <nav
      role="navigation"
      aria-label="Primary destinations"
      className="fixed bottom-0 left-0 right-0 z-[75] border-t border-slate-200/80 bg-white/95 pb-[max(env(safe-area-inset-bottom),0px)] shadow-[0_-8px_20px_-16px_rgba(15,23,42,0.35)] backdrop-blur-lg transition-[transform,opacity] duration-300 ease-out dark:border-slate-800/80 dark:bg-slate-950/92 dark:shadow-black/40 lg:hidden"
    >
      <div
        className={clsx(
          'grid min-h-[64px] items-stretch px-2 pb-1 pt-1',
          visibleItems.length === 4 ? 'grid-cols-4' : 'grid-cols-3',
        )}
      >
        {visibleItems.map(({ id, label, href, icon: Icon }) => {
          const active = navReady && isItemActive(id, pathname, stream)
          return (
            <Link
              key={id}
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'relative flex min-h-[58px] flex-col items-center justify-center rounded-xl px-2 py-1.5 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950',
                active
                  ? 'bg-primary-100/90 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200',
              )}
            >
              <span
                className={clsx(
                  'mb-0.5 inline-flex items-center justify-center',
                  active
                    ? 'text-primary-600 dark:text-primary-300'
                    : 'text-slate-500 dark:text-slate-400',
                )}
                aria-hidden
              >
                <Icon size={19} strokeWidth={active ? 2.3 : 2.1} aria-hidden />
              </span>
              <span
                className={clsx(
                  'text-[11px] leading-tight tracking-[0.01em]',
                  active ? 'font-semibold' : 'font-medium',
                )}
              >
                {label}
              </span>
              <span
                className={clsx(
                  'absolute inset-x-8 top-0.5 h-[2px] rounded-full bg-primary-500 transition-opacity duration-200 dark:bg-primary-400',
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
