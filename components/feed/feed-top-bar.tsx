import { StreamTabs } from '@/components/feed/stream-tabs'
import { FeedScopeTabs } from '@/components/feed/feed-scope-tabs'
import { FeedIntro } from '@/components/feed/feed-intro'
import { FeedTaxonomyFilters } from '@/components/feed/feed-taxonomy-filters'
import { ActiveFiltersBar } from '@/components/feed/active-filters-bar'
import { FeedFiltersChrome } from '@/components/feed/feed-filters-chrome'
import { isScopeEnabledStream, type FeedScope } from '@/lib/feed/scope'
import type { ScopeCounts } from '@/lib/queries/scope-counts'
import type { ContentStream, TagSummary } from '@/types/article'
import type { TagCounts } from '@/lib/queries/tag-counts'
import type { StreamArticleCounts } from '@/lib/queries/stream-counts'

type Props = {
  stream: ContentStream
  scope?: FeedScope
  scopeCounts: ScopeCounts | null
  tags: TagSummary[]
  counts: TagCounts
  streamCounts: StreamArticleCounts
  streamLabel: string
  shownCount: number
  totalCount?: number
  skimView?: boolean
}

export function FeedTopBar({
  stream,
  scope,
  scopeCounts,
  tags,
  counts,
  streamCounts,
  streamLabel,
  shownCount,
  totalCount,
  skimView = false,
}: Props) {
  const scopeEnabled = isScopeEnabledStream(stream)
  const activeScope = scope ?? 'global'

  return (
    <div className="-mx-4 -mt-6 mb-5 lg:-mx-6">
      <div className="hidden justify-center border-b border-border bg-header px-4 py-3 backdrop-blur-sm sm:flex sm:justify-start lg:px-6">
        <StreamTabs
          activeStream={stream}
          activeScope={scopeEnabled ? activeScope : undefined}
          streamCounts={streamCounts}
        />
      </div>

      {scopeEnabled && scopeCounts ? (
        <div className="hidden border-b border-border/70 bg-header/80 px-4 py-2 backdrop-blur-sm sm:flex sm:justify-start lg:px-6">
          <FeedScopeTabs
            stream={stream}
            activeScope={activeScope}
            scopeCounts={scopeCounts}
          />
        </div>
      ) : null}

      <FeedFiltersChrome>
        <section
          className="sticky top-[var(--header-height)] z-40 overflow-x-hidden border-b border-border bg-rail/95 backdrop-blur-sm"
          aria-label="Feed filters"
        >
          <div className="space-y-2 px-4 py-2.5 lg:px-6">
            {scopeEnabled && scopeCounts ? (
              <div className="sm:hidden">
                <FeedScopeTabs
                  stream={stream}
                  activeScope={activeScope}
                  scopeCounts={scopeCounts}
                />
              </div>
            ) : null}
            <FeedTaxonomyFilters stream={stream} tags={tags} counts={counts} />
            <ActiveFiltersBar />
          </div>
        </section>
      </FeedFiltersChrome>

      <FeedIntro
        stream={stream}
        scope={scopeEnabled ? activeScope : undefined}
        streamLabel={streamLabel}
        shownCount={shownCount}
        totalCount={totalCount}
        compact={skimView}
      />
    </div>
  )
}
