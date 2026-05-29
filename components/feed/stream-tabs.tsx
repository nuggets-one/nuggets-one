import Link from 'next/link'
import type { ContentStream } from '@/types/article'
import type { StreamArticleCounts } from '@/lib/queries/stream-counts'

const STREAMS: { value: ContentStream; label: string; href: string }[] = [
  { value: 'standard', label: 'Nuggets', href: '/?stream=standard' },
  { value: 'pulse', label: 'Market Pulse', href: '/?stream=pulse' },
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
      className="flex w-full gap-1 rounded-lg bg-rail p-1 sm:inline-flex sm:w-auto lg:inline-flex lg:w-[22rem]"
    >
      {STREAMS.map(({ value, label, href }) => {
        const active = activeStream === value
        const count = streamCounts[value]
        const formattedCount = numberFmt.format(count)
        return (
          <Link
            key={value}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={`${label}, ${formattedCount} published articles`}
            className={`flex min-h-[44px] flex-1 items-center justify-center rounded-md px-3 text-sm tracking-tight outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] sm:flex-none sm:px-5 lg:flex-1 lg:basis-0 lg:min-w-0 ${
              active
                ? 'border border-chip-active-border bg-chip-active-bg font-semibold text-chip-active-text shadow-chip-active'
                : 'font-medium text-chip-inactive-text hover:bg-chip-hover-bg hover:text-chip-hover-text'
            }`}
          >
            <span className="inline-flex items-baseline justify-center gap-1.5">
              <span>{label}</span>
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
