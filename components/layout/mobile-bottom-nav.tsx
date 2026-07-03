'use client'

import clsx from 'clsx'
import { Activity, Cpu, Globe, House, LayoutGrid, Users, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQueryState } from 'nuqs'
import { useSyncExternalStore } from 'react'
import { useFeedPendingOptional } from '@/components/feed/feed-pending-context'
import { FEED_INTRO_COPY, parseFeedStream, STREAM_NAV_ORDER } from '@/lib/copy/streams'
import {
  buildStreamTabHref,
  parseFeedScope,
  type FeedScope,
} from '@/lib/feed/scope'
import { DEFAULT_FEED_STREAM, type FeedStream } from '@/types/article'

const STREAM_ICONS: Record<(typeof STREAM_NAV_ORDER)[number], LucideIcon> = {
  all: LayoutGrid,
  pulse: Activity,
  tech_vc: Cpu,
  standard: House,
  leadership: Users,
  geopolitics: Globe,
}

function isStreamActive(
  streamId: FeedStream,
  pathname: string,
  stream: FeedStream,
): boolean {
  return pathname === '/' && stream === streamId
}

function hrefForStream(streamId: FeedStream, activeScope: FeedScope): string {
  return buildStreamTabHref(streamId, activeScope)
}

export function MobileBottomNav() {
  const pathname = usePathname() ?? ''
  const [stream] = useQueryState<FeedStream>('stream', {
    defaultValue: DEFAULT_FEED_STREAM,
    parse: (v): FeedStream => parseFeedStream(v),
    shallow: true,
  })
  const [scopeRaw] = useQueryState('scope', {
    defaultValue: '',
    shallow: true,
  })
  const activeScope = parseFeedScope(scopeRaw || null)
  const feedPending = useFeedPendingOptional()
  const navReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  return (
    <nav
      role="navigation"
      aria-label="Primary destinations"
      className="fixed bottom-0 left-0 right-0 z-[75] border-t border-slate-200/80 bg-white/95 pb-[max(env(safe-area-inset-bottom),0px)] shadow-[0_-8px_20px_-16px_rgba(15,23,42,0.35)] backdrop-blur-lg transition-[transform,opacity] duration-300 ease-out dark:border-slate-800/80 dark:bg-slate-950/92 dark:shadow-black/40 lg:hidden"
    >
      <div className="grid min-h-[64px] grid-cols-6 items-stretch px-1 pb-1 pt-1 sm:px-2">
        {STREAM_NAV_ORDER.map((streamId) => {
          const { shortLabel: label, label: ariaLabel } = FEED_INTRO_COPY[streamId]
          const Icon = STREAM_ICONS[streamId]
          const active = navReady && isStreamActive(streamId, pathname, stream)
          const href = hrefForStream(streamId, activeScope)
          return (
            <Link
              key={streamId}
              href={href}
              aria-label={ariaLabel}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                if (!active) {
                  feedPending?.markFeedPending()
                }
              }}
              className={clsx(
                'relative flex min-h-[58px] flex-col items-center justify-center rounded-xl px-0.5 py-1.5 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 sm:px-1',
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
                  'text-[9px] leading-tight tracking-[0.01em] sm:text-[10px]',
                  active ? 'font-semibold' : 'font-medium',
                )}
              >
                {label}
              </span>
              <span
                className={clsx(
                  'absolute inset-x-2 top-0.5 h-[2px] rounded-full bg-primary-500 transition-opacity duration-200 dark:bg-primary-400 sm:inset-x-4',
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
