import { StreamTabs } from '@/components/feed/stream-tabs'
import { FeedIntro } from '@/components/feed/feed-intro'
import { FeedTaxonomyFilters } from '@/components/feed/feed-taxonomy-filters'
import { ActiveFiltersBar } from '@/components/feed/active-filters-bar'
import type { ContentStream, TagSummary } from '@/types/article'
import type { TagCounts } from '@/lib/queries/tag-counts'

type Props = {
  stream: ContentStream
  tags: TagSummary[]
  counts: TagCounts
  streamLabel: string
  shownCount: number
  totalCount: number
}

export function FeedTopBar({
  stream,
  tags,
  counts,
  streamLabel,
  shownCount,
  totalCount,
}: Props) {
  return (
    <div className="-mx-4 -mt-6 mb-5 lg:-mx-6">
      <div className="border-b border-border bg-header px-4 pt-2 backdrop-blur-sm lg:px-6">
        <StreamTabs activeStream={stream} />
      </div>

      <section
        className="sticky top-[var(--header-height)] z-40 border-b border-border bg-rail/95 backdrop-blur-sm"
        aria-label="Feed filters"
      >
        <div className="space-y-3 px-4 py-3 lg:px-6">
          <FeedTaxonomyFilters tags={tags} counts={counts} />
          <ActiveFiltersBar tags={tags} />
        </div>
      </section>

      <FeedIntro
        stream={stream}
        streamLabel={streamLabel}
        shownCount={shownCount}
        totalCount={totalCount}
      />
    </div>
  )
}
