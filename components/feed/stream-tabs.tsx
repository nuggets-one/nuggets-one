'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { STREAM_INTRO_COPY } from '@/lib/copy/streams'
import { buildStreamTabHref, type FeedScope } from '@/lib/feed/scope'
import { useFeedPending } from '@/components/feed/feed-pending-context'
import type { ContentStream } from '@/types/article'
import type { StreamArticleCounts } from '@/lib/queries/stream-counts'

const STREAMS: {
  value: ContentStream
  shortLabel: string
  fullLabel: string
}[] = [
  {
    value: 'standard',
    fullLabel: STREAM_INTRO_COPY.standard.label,
    shortLabel: STREAM_INTRO_COPY.standard.shortLabel,
  },
  {
    value: 'pulse',
    fullLabel: STREAM_INTRO_COPY.pulse.label,
    shortLabel: STREAM_INTRO_COPY.pulse.shortLabel,
  },
  {
    value: 'charts',
    fullLabel: STREAM_INTRO_COPY.charts.label,
    shortLabel: STREAM_INTRO_COPY.charts.shortLabel,
  },
]

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
})

type Props = {
  activeStream: ContentStream
  activeScope?: FeedScope
  streamCounts: StreamArticleCounts
  /** When true, stream group sizes to content (for lg toolbar row with scope on the right). */
  inlineToolbar?: boolean
}

function StreamTabLink({
  href,
  active,
  fullLabel,
  shortLabel,
  formattedCount,
  useShortOnMobile,
}: {
  href: string
  active: boolean
  fullLabel: string
  shortLabel: string
  formattedCount: string
  useShortOnMobile: boolean
}) {
  const router = useRouter()
  const { markFeedPending } = useFeedPending()

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      aria-label={`${fullLabel}, ${formattedCount} published articles`}
      onClick={(event) => {
        if (active) return
        event.preventDefault()
        markFeedPending()
        router.push(href)
      }}
      className={`flex min-h-[44px] flex-1 items-center justify-center rounded-md px-2 text-sm tracking-tight outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] sm:flex-none sm:px-3 lg:flex-none ${
        active
          ? 'border border-chip-active-border bg-chip-active-bg font-semibold text-chip-active-text shadow-chip-active'
          : 'font-medium text-chip-inactive-text hover:bg-chip-hover-bg hover:text-chip-hover-text'
      }`}
    >
      <span className="inline-flex items-baseline justify-center gap-1.5 whitespace-nowrap">
        {useShortOnMobile ? (
          <>
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{fullLabel}</span>
          </>
        ) : (
          <span>{fullLabel}</span>
        )}
        <span
          className={`hidden font-normal tabular-nums lg:inline text-xs ${
            active ? 'text-chip-active-text/75' : 'text-chip-inactive-text/70'
          }`}
        >
          ({formattedCount})
        </span>
      </span>
    </Link>
  )
}

export function StreamTabs({
  activeStream,
  activeScope,
  streamCounts,
  inlineToolbar = false,
}: Props) {
  return (
    <nav
      aria-label="Content stream"
      className="flex w-full gap-1 rounded-lg bg-rail p-1 sm:inline-flex sm:w-auto lg:w-auto"
    >
      {STREAMS.map(({ value, fullLabel, shortLabel }) => {
        const active = activeStream === value
        const count = streamCounts[value]
        const formattedCount = numberFmt.format(count)
        const useShortOnMobile = shortLabel !== fullLabel
        const href = buildStreamTabHref(value, activeScope)
        return (
          <StreamTabLink
            key={value}
            href={href}
            active={active}
            fullLabel={fullLabel}
            shortLabel={shortLabel}
            formattedCount={formattedCount}
            useShortOnMobile={useShortOnMobile}
          />
        )
      })}
    </nav>
  )
}
