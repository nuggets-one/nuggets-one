import type { ReactNode } from 'react'
import { STREAM_INTRO_COPY } from '@/lib/copy/streams'
import { getScopeLabel, type FeedScope } from '@/lib/feed/scope'
import type { ContentStream } from '@/types/article'

type Props = {
  stream: ContentStream
  scope?: FeedScope
  streamLabel: string
  shownCount: number
  totalCount?: number
  /** Skim mode: condensed intro on mobile. */
  compact?: boolean
}

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
})

const introDivider = (
  <span className="mx-1 text-muted/80" aria-hidden="true">
    {'\u2009|\u2009'}
  </span>
)

const labelDot = (
  <span className="mx-1 text-muted/80" aria-hidden="true">
    {'\u2009\u00b7\u2009'}
  </span>
)

function SummaryWithCount({
  streamLabel,
  scopeLabel,
  summary,
  countLine,
  className,
}: {
  streamLabel: string
  scopeLabel?: string
  summary: string
  countLine: ReactNode
  className?: string
}) {
  return (
    <p className={className}>
      <span className="font-medium text-primary">{streamLabel}</span>
      {scopeLabel ? (
        <>
          {labelDot}
          <span className="font-medium text-primary">{scopeLabel}</span>
        </>
      ) : null}
      {labelDot}
      <span>{summary}</span>
      {introDivider}
      {countLine}
    </p>
  )
}

function MetaLine({
  streamLabel,
  scopeLabel,
  countLine,
}: {
  streamLabel: string
  scopeLabel?: string
  countLine: ReactNode
}) {
  return (
    <p className="mt-1.5 text-[11.5px] leading-4 text-muted sm:text-xs">
      <span className="font-medium text-primary">{streamLabel}</span>
      {scopeLabel ? (
        <>
          {labelDot}
          <span className="font-medium text-primary">{scopeLabel}</span>
        </>
      ) : null}
      {labelDot}
      {countLine}
    </p>
  )
}

export function FeedIntro({
  stream,
  scope,
  streamLabel,
  shownCount,
  totalCount,
  compact = false,
}: Props) {
  const { title, tagline, mobileSummary } = STREAM_INTRO_COPY[stream]
  const shown = numberFmt.format(shownCount)
  const hasExactTotal = typeof totalCount === 'number'
  const total = hasExactTotal ? numberFmt.format(totalCount) : null
  const scopeLabel = scope ? getScopeLabel(scope) : undefined

  const countLine = hasExactTotal ? (
    <span>Showing {shown} of {total}</span>
  ) : (
    <span>Showing {shown} results</span>
  )

  const summaryLineClass =
    'line-clamp-2 text-[11.5px] leading-4 text-muted sm:text-xs'

  if (compact) {
    return (
      <section
        className="mb-0.5 px-4 pb-0.5 pt-2 lg:px-6"
        aria-label="Homepage intro"
      >
        <div className="md:hidden">
          <h1 className="sr-only">{title}</h1>
          <SummaryWithCount
            streamLabel={streamLabel}
            scopeLabel={scopeLabel}
            summary={mobileSummary}
            countLine={countLine}
            className={summaryLineClass}
          />
        </div>
        <div className="hidden md:block">
          <h1 className="max-w-[62ch] text-[15px] font-medium leading-5 tracking-tight text-primary sm:text-base lg:max-w-none">
            {title}
          </h1>
          <p className="mt-0.5 max-w-[62ch] text-[11.5px] leading-4 text-muted sm:text-xs lg:max-w-none">
            {tagline}
          </p>
          <MetaLine
            streamLabel={streamLabel}
            scopeLabel={scopeLabel}
            countLine={countLine}
          />
        </div>
      </section>
    )
  }

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
      <MetaLine
        streamLabel={streamLabel}
        scopeLabel={scopeLabel}
        countLine={countLine}
      />
    </section>
  )
}
