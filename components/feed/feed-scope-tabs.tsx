'use client'

import Link from 'next/link'
import {
  buildHomeHref,
  getScopeAriaLabel,
  getScopeLabel,
  getScopesForStream,
  type FeedScope,
} from '@/lib/feed/scope'
import { STREAM_INTRO_COPY } from '@/lib/copy/streams'
import { useFeedPending } from '@/components/feed/feed-pending-context'
import type { ScopeCounts } from '@/lib/queries/scope-counts'

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
})

type Props = {
  stream: 'all' | 'standard' | 'pulse' | 'tech_vc'
  activeScope: FeedScope
  scopeCounts: ScopeCounts
  /** Tighter sizing when scope sits on the lg stream toolbar row. */
  inlineToolbar?: boolean
}

function getScopeDisplayLabel(scope: FeedScope): string {
  if (scope === 'charts') return STREAM_INTRO_COPY.charts.label
  return getScopeLabel(scope)
}

function ScopeTabLink({
  href,
  active,
  label,
  ariaLabel,
  formattedCount,
  useShortChartsLabel,
}: {
  href: string
  active: boolean
  label: string
  ariaLabel: string
  formattedCount: string
  useShortChartsLabel: boolean
}) {
  const { markFeedPending } = useFeedPending()

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      aria-label={`${ariaLabel}, ${formattedCount} published articles`}
      onClick={() => {
        // Let <Link> handle prefetch + client navigation; just flip on the
        // instant skeleton overlay so the switch feels immediate.
        if (!active) markFeedPending()
      }}
      className={`flex min-h-[36px] flex-1 items-center justify-center rounded-md px-3 text-xs tracking-tight outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] sm:flex-none sm:min-w-[7rem] ${
        active
          ? 'border border-chip-active-border/80 bg-chip-active-bg font-semibold text-chip-active-text shadow-sm'
          : 'font-medium text-chip-inactive-text hover:bg-chip-hover-bg hover:text-chip-hover-text'
      }`}
    >
      <span className="inline-flex items-baseline justify-center gap-1.5">
        {useShortChartsLabel ? (
          <>
            <span className="lg:hidden">{getScopeLabel('charts')}</span>
            <span className="hidden lg:inline">{label}</span>
          </>
        ) : (
          <span>{label}</span>
        )}
        <span
          className={`hidden font-normal tabular-nums lg:inline ${
            active ? 'text-chip-active-text/75' : 'text-chip-inactive-text/70'
          }`}
        >
          ({formattedCount})
        </span>
      </span>
    </Link>
  )
}

export function FeedScopeTabs({
  stream,
  activeScope,
  scopeCounts,
  inlineToolbar = false,
}: Props) {
  const scopes = getScopesForStream(stream)

  return (
    <nav
      aria-label="Content scope"
      className={`flex gap-1 rounded-md bg-rail/60 p-0.5 ${
        inlineToolbar
          ? 'w-auto shrink-0'
          : 'w-full gap-1 sm:inline-flex sm:w-auto'
      }`}
    >
      {scopes.map((scope) => {
        const active = activeScope === scope
        const count = scopeCounts[scope]
        const formattedCount = numberFmt.format(count)
        const label = getScopeDisplayLabel(scope)
        const ariaLabel = getScopeAriaLabel(scope)
        return (
          <ScopeTabLink
            key={scope}
            href={buildHomeHref(stream, scope)}
            active={active}
            label={label}
            ariaLabel={ariaLabel}
            formattedCount={formattedCount}
            useShortChartsLabel={scope === 'charts'}
          />
        )
      })}
    </nav>
  )
}
