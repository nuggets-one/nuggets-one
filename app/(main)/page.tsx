import { Suspense } from 'react'
import { unstable_noStore } from 'next/cache'
import { getFeedPage } from '@/lib/queries/feed'
import { listOfficialTags } from '@/lib/queries/tags'
import { getBookmarkedArticleIds } from '@/lib/queries/bookmarks'
import { ArticleCard } from '@/components/ui/article-card'
import { FeedSkeleton } from '@/components/feed/feed-skeleton'
import { FeedPager } from '@/components/feed/feed-pager'
import { FeedEmpty } from '@/components/feed/feed-empty'
import { StreamTabs } from '@/components/feed/stream-tabs'
import { TagChipRail } from '@/components/feed/tag-chip-rail'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_STREAM } from '@/types/article'
import type { ContentStream } from '@/types/article'

// Pulse SLA = 120s. Standard could be 300s but we use the shorter
// so pulse users never wait >120s for new articles.
// BLUEPRINT §11: "Only canonical first page is server-cacheable via revalidateTag.
// Filtered URLs are dynamic."
export const revalidate = 120

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

  // Filtered or search URLs must never be served from stale ISR cache.
  // BLUEPRINT §11: "Filtered / search URLs → expect dynamic behavior."
  const hasFilters = !!(searchParams.tags || searchParams.q)
  if (hasFilters) {
    unstable_noStore()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  const [feedResult, officialTags] = await Promise.all([
    hasFilters
      ? getFeedPage({ stream, tags, q })
      : getFeedPage({ stream, tags: [], q: '' }),
    listOfficialTags(),
  ])

  const { articles, nextCursor } = feedResult

  // Batch bookmark check — BLUEPRINT: "one batched GET per feed page (24 IDs max)"
  const bookmarkedIds = isAuthenticated
    ? await getBookmarkedArticleIds(articles.map((a) => a.id))
    : new Set<string>()

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
              isAuthenticated={isAuthenticated}
              initialBookmarked={bookmarkedIds.has(article.id)}
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
          isAuthenticated={isAuthenticated}
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
