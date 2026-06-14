import Link from 'next/link'
import { STREAM_INTRO_COPY } from '@/lib/copy/streams'
import type { ContentStream } from '@/types/article'
import type { StreamArticleCounts } from '@/lib/queries/stream-counts'

const STREAMS: {
  value: ContentStream
  href: string
  shortLabel: string
  fullLabel: string
}[] = [
  {
    value: 'standard',
    fullLabel: STREAM_INTRO_COPY.standard.label,
    shortLabel: STREAM_INTRO_COPY.standard.shortLabel,
    href: '/?stream=standard',
  },
  {
    value: 'pulse',
    fullLabel: STREAM_INTRO_COPY.pulse.label,
    shortLabel: STREAM_INTRO_COPY.pulse.shortLabel,
    href: '/?stream=pulse',
  },
  {
    value: 'charts',
    fullLabel: STREAM_INTRO_COPY.charts.label,
    shortLabel: STREAM_INTRO_COPY.charts.shortLabel,
    href: '/?stream=charts',
  },
]

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
})

type Props = {
  activeStream: ContentStream
  streamCounts: StreamArticleCounts
}

export function StreamTabs({ activeStream, streamCounts }: Props) {
  return (
    <nav
      aria-label="Content stream"
      className="flex w-full gap-1 rounded-lg bg-rail p-1 sm:inline-flex sm:w-auto lg:inline-flex lg:w-[32rem]"
    >
      {STREAMS.map(({ value, fullLabel, shortLabel, href }) => {
        const active = activeStream === value
        const count = streamCounts[value]
        const formattedCount = numberFmt.format(count)
        const useShortOnMobile = shortLabel !== fullLabel
        return (
          <Link
            key={value}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={`${fullLabel}, ${formattedCount} published articles`}
            className={`flex min-h-[44px] flex-1 items-center justify-center rounded-md px-2 text-sm tracking-tight outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] sm:flex-none sm:px-3 lg:flex-1 lg:basis-0 lg:min-w-0 ${
              active
                ? 'border border-chip-active-border bg-chip-active-bg font-semibold text-chip-active-text shadow-chip-active'
                : 'font-medium text-chip-inactive-text hover:bg-chip-hover-bg hover:text-chip-hover-text'
            }`}
          >
            <span className="inline-flex items-baseline justify-center gap-1.5">
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
      })}
    </nav>
  )
}
