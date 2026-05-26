import type { ContentStream } from '@/types/article'

/** Visible intro aligned with `metadata` on `/` for Nuggets; Market Pulse is stream-specific. */
const INTRO_COPY: Record<ContentStream, { title: string; tagline: string }> = {
  standard: {
    title: 'Nuggets | Curated insights across markets, macros, AI, tech & geopolitics',
    tagline:
      'Distilling high-signal intelligence into digestible insights.',
  },
  pulse: {
    title: 'Market Pulse | High-signal updates for investors and operators',
    tagline:
      'Daily stream of high-signal market updates and intelligence. Refreshed every day.',
  },
}

type Props = {
  stream: ContentStream
  streamLabel: string
  shownCount: number
  totalCount?: number
}

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
})

export function FeedIntro({ stream, streamLabel, shownCount, totalCount }: Props) {
  const { title, tagline } = INTRO_COPY[stream]
  const shown = numberFmt.format(shownCount)
  const hasExactTotal = typeof totalCount === 'number'
  const total = hasExactTotal ? numberFmt.format(totalCount) : null

  return (
    <section
      className="mb-0.5 px-4 pb-0.5 pt-2 lg:px-6"
      aria-label="Homepage intro"
    >
      <h1 className="max-w-[62ch] text-[15px] font-medium leading-5 tracking-tight text-primary sm:text-base lg:max-w-none">
        {title}
      </h1>
      <p className="mt-0.5 max-w-[62ch] text-[11.5px] leading-4 text-muted sm:text-xs lg:max-w-none">
        {tagline}
      </p>
      <p className="mt-1.5 text-[11.5px] leading-4 text-muted sm:text-xs">
        <span className="font-medium text-primary">{streamLabel}</span>
        <span className="mx-1 text-muted/80" aria-hidden="true">
          {'\u2009\u00b7\u2009'}
        </span>
        {hasExactTotal ? (
          <span>Showing {shown} of {total}</span>
        ) : (
          <span>Showing {shown} results</span>
        )}
      </p>
    </section>
  )
}
