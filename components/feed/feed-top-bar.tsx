import { StreamTabs } from '@/components/feed/stream-tabs'
import { FeedTaxonomyFilters } from '@/components/feed/feed-taxonomy-filters'
import { ActiveFiltersBar } from '@/components/feed/active-filters-bar'
import type { TagSummary } from '@/types/article'
import type { TagCounts } from '@/lib/queries/tag-counts'

type Props = {
  tags: TagSummary[]
  counts: TagCounts
  streamLabel: string
  shownCount: number
  totalCount: number
}

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
})

export function FeedTopBar({
  tags,
  counts,
  streamLabel,
  shownCount,
  totalCount,
}: Props) {
  const shown = numberFmt.format(shownCount)
  const total = numberFmt.format(totalCount)

  return (
    <section
      className="sticky top-[var(--header-height)] z-40 -mx-4 mb-5 border-b border-border bg-rail/95 backdrop-blur-sm lg:-mx-6"
      aria-label="Feed navigation and filters"
    >
      <div className="px-4 py-3 lg:px-6">
        <div className="space-y-3">
          <StreamTabs />
          <FeedTaxonomyFilters tags={tags} counts={counts} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs">
              <span className="font-semibold text-primary">{streamLabel}</span>
              <span className="mx-1 text-muted/80" aria-hidden="true">
                {'\u2009\u00b7\u2009'}
              </span>
              <span className="text-muted">
                Showing {shown} of {total}
              </span>
            </p>
            <ActiveFiltersBar tags={tags} />
          </div>
        </div>
      </div>
    </section>
  )
}
