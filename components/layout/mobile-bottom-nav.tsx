'use client'

import clsx from 'clsx'
import { Activity, BarChart2, Bookmark, House, Layers, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQueryState } from 'nuqs'
import { useMemo, useSyncExternalStore } from 'react'
import { useAuthStatus } from '@/components/layout/auth-status-provider'
import { useFeedPendingOptional } from '@/components/feed/feed-pending-context'
import { parseContentStream, STREAM_INTRO_COPY } from '@/lib/copy/streams'
import {
  buildStreamTabHref,
  parseFeedScope,
  type FeedScope,
} from '@/lib/feed/scope'
import { DEFAULT_STREAM, type ContentStream } from '@/types/article'

function pathActive(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`)
}

type NavItemId = 'nuggets' | 'pulse' | 'charts' | 'collections' | 'bookmarks'

type NavItem = {
  id: NavItemId
  label: string
  ariaLabel: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { id: 'nuggets', label: 'Nuggets', ariaLabel: 'Nuggets', icon: House },
  {
    id: 'pulse',
    label: 'Pulse',
    ariaLabel: STREAM_INTRO_COPY.pulse.label,
    icon: Activity,
  },
  {
    id: 'charts',
    label: STREAM_INTRO_COPY.charts.shortLabel,
    ariaLabel: STREAM_INTRO_COPY.charts.label,
    icon: BarChart2,
  },
  { id: 'collections', label: 'Collections', ariaLabel: 'Collections', icon: Layers },
  { id: 'bookmarks', label: 'Bookmarks', ariaLabel: 'Bookmarks', icon: Bookmark },
]

function isItemActive(
  id: NavItemId,
  pathname: string,
  stream: ContentStream,
): boolean {
  const onHome = pathname === '/'
  switch (id) {
    case 'nuggets':
      return onHome && stream === 'standard'
    case 'pulse':
      return onHome && stream === 'pulse'
    case 'charts':
      return onHome && stream === 'charts'
    case 'collections':
      return pathActive(pathname, '/collections')
    case 'bookmarks':
      return pathActive(pathname, '/bookmarks')
  }
}

function hrefForNavItem(id: NavItemId, activeScope: FeedScope): string {
  switch (id) {
    case 'nuggets':
      return buildStreamTabHref('standard', activeScope)
    case 'pulse':
      return buildStreamTabHref('pulse', activeScope)
    case 'charts':
      return '/?stream=charts'
    case 'collections':
      return '/collections'
    case 'bookmarks':
      return '/bookmarks'
  }
}

export function MobileBottomNav() {
  const pathname = usePathname() ?? ''
  const [stream] = useQueryState<ContentStream>('stream', {
    defaultValue: DEFAULT_STREAM,
    parse: (v): ContentStream => parseContentStream(v),
    shallow: true,
  })
  const [scopeRaw] = useQueryState('scope', {
    defaultValue: '',
    shallow: true,
  })
  const activeScope = parseFeedScope(scopeRaw || null)
  const auth = useAuthStatus()
  const feedPending = useFeedPendingOptional()
  const navReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const visibleItems = useMemo(() => {
    // Keep SSR and hydration markup identical, then reveal auth-only tabs.
    if (!navReady || auth.status !== 'authenticated') {
      return NAV_ITEMS.filter((item) => item.id !== 'bookmarks')
    }
    return NAV_ITEMS
  }, [auth.status, navReady])

  const gridCols =
    visibleItems.length >= 5
      ? 'grid-cols-5'
      : visibleItems.length === 4
        ? 'grid-cols-4'
        : 'grid-cols-3'

  return (
    <nav
      role="navigation"
      aria-label="Primary destinations"
      className="fixed bottom-0 left-0 right-0 z-[75] border-t border-slate-200/80 bg-white/95 pb-[max(env(safe-area-inset-bottom),0px)] shadow-[0_-8px_20px_-16px_rgba(15,23,42,0.35)] backdrop-blur-lg transition-[transform,opacity] duration-300 ease-out dark:border-slate-800/80 dark:bg-slate-950/92 dark:shadow-black/40 lg:hidden"
    >
      <div
        className={clsx(
          'grid min-h-[64px] items-stretch px-1 pb-1 pt-1 sm:px-2',
          gridCols,
        )}
      >
        {visibleItems.map(({ id, label, ariaLabel, icon: Icon }) => {
          const active = navReady && isItemActive(id, pathname, stream)
          const href = hrefForNavItem(id, activeScope)
          const isHomeStreamNav = id === 'nuggets' || id === 'pulse' || id === 'charts'
          return (
            <Link
              key={id}
              href={href}
              aria-label={ariaLabel}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                if (isHomeStreamNav && !active) {
                  feedPending?.markFeedPending()
                }
              }}
              className={clsx(
                'relative flex min-h-[58px] flex-col items-center justify-center rounded-xl px-1 py-1.5 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 sm:px-2',
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
                  'text-[10px] leading-tight tracking-[0.01em] sm:text-[11px]',
                  active ? 'font-semibold' : 'font-medium',
                )}
              >
                {label}
              </span>
              <span
                className={clsx(
                  'absolute inset-x-4 top-0.5 h-[2px] rounded-full bg-primary-500 transition-opacity duration-200 dark:bg-primary-400 sm:inset-x-8',
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
