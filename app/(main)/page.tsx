import { Suspense } from 'react'
import { getFeedPage } from '@/lib/queries/feed'
import { listOfficialTags } from '@/lib/queries/tags'
import { ArticleCard } from '@/components/ui/article-card'
import { FeedSkeleton } from '@/components/feed/feed-skeleton'
import { FeedPager } from '@/components/feed/feed-pager'
import { FeedEmpty } from '@/components/feed/feed-empty'
import { StreamTabs } from '@/components/feed/stream-tabs'
import { TagChipRail } from '@/components/feed/tag-chip-rail'
import { DEFAULT_STREAM } from '@/types/article'
import type { ContentStream } from '@/types/article'

// Only the canonical first page (no filters, no q) benefits from ISR.
// Filtered URLs are dynamic due to searchParams usage.
export const revalidate = 300

type SearchParams = {
  stream?: string
  tags?: string
  q?: string
}

type Props = {
  searchParams: Promise<SearchParams>
}

async function FeedGrid({ searchParams }: { searchParams: SearchParams }) {
  const stream = (searchParams.stream === 'pulse' ? 'pulse' : DEFAULT_STREAM) as ContentStream
  const tagsRaw = searchParams.tags ?? ''
  const tags = tagsRaw ? tagsRaw.split(',').filter(Boolean) : []
  const q = searchParams.q ?? ''

  const [feedResult, officialTags] = await Promise.all([
    getFeedPage({ stream, tags, q }),
    listOfficialTags(),
  ])

  const { articles, nextCursor } = feedResult

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <StreamTabs />
        <TagChipRail tags={officialTags} />
      </div>

      {articles.length === 0 ? (
        <FeedEmpty q={q} hasTags={tags.length > 0} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {articles.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              priority={index === 0}
            />
          ))}
        </div>
      )}

      {articles.length > 0 && (
        <FeedPager
          initialCursor={nextCursor}
          stream={stream}
          tags={tags}
          q={q}
        />
      )}
    </>
  )
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams

  return (
    <Suspense fallback={
      <>
        <div className="flex flex-col gap-4 mb-6">
          <div className="h-10 w-60 rounded-lg bg-surface-raised animate-pulse" />
          <div className="h-8 w-full rounded-full bg-surface-raised animate-pulse" />
        </div>
        <FeedSkeleton count={6} />
      </>
    }>
      <FeedGrid searchParams={params} />
    </Suspense>
  )
}
