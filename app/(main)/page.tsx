import type { Metadata } from 'next'
import { Suspense } from 'react'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuggets.one'
const homeOgImage = `${siteUrl}/og-default.png`

export const metadata: Metadata = {
  title: 'Nuggets — Curated knowledge, delivered fast',
  description: 'Hand-curated reads across technology, markets, and ideas. Standard and Market Pulse streams.',
  openGraph: {
    title: 'Nuggets — Curated knowledge, delivered fast',
    description: 'Hand-curated reads across technology, markets, and ideas.',
    url: siteUrl,
    siteName: 'Nuggets',
    type: 'website',
    images: [{ url: homeOgImage }],
  },
  twitter: {
    card: 'summary_large_image',
    images: [homeOgImage],
  },
}
import { unstable_noStore } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getFeedPage } from '@/lib/queries/feed'
import { listOfficialTags } from '@/lib/queries/tags'
import { getTagCountsForStream } from '@/lib/queries/tag-counts'
import { getBookmarkedArticleIdsForUser } from '@/lib/queries/bookmarks'
import { ArticleCard } from '@/components/ui/article-card'
import { BookmarkBatchHydrator } from '@/components/ui/bookmark-batch-hydrator'
import { FeedSkeleton } from '@/components/feed/feed-skeleton'
import { FeedPager } from '@/components/feed/feed-pager'
import { FeedEmpty } from '@/components/feed/feed-empty'
import { FeedTopBar } from '@/components/feed/feed-top-bar'
import { DEFAULT_STREAM } from '@/types/article'
import type { ContentStream } from '@/types/article'

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

  const [feedResult, officialTags, tagCounts] = await Promise.all([
    (hasFilters
      ? getFeedPage({ stream, tags, q })
      : getFeedPage({ stream, tags: [], q: '' })
    ).catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`FeedGrid getFeedPage error: ${message}`)
      return { articles: [], nextCursor: null, stream, totalCount: 0 }
    }),
    listOfficialTags().catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`FeedGrid listOfficialTags error: ${message}`)
      return []
    }),
    getTagCountsForStream(stream).catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`FeedGrid getTagCountsForStream error: ${message}`)
      return {}
    }),
  ])

  const { articles, nextCursor } = feedResult
  const totalCount = typeof feedResult.totalCount === 'number' ? feedResult.totalCount : articles.length
  const streamLabel = stream === 'pulse' ? 'Market Pulse' : 'Nuggets'
  const resultLabel = `${articles.length} of ${totalCount} shown`

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthenticated = !!user
  const articleIds = articles.map((a) => a.id)
  const bookmarkedIds =
    user && articleIds.length > 0
      ? await getBookmarkedArticleIdsForUser(user.id, articleIds)
      : new Set<string>()

  // Batch bookmark check — BLUEPRINT: "one batched GET per feed page (24 IDs max)"
  return (
    <>
      <div className="-mt-4 lg:-mt-4">
        <FeedTopBar
          tags={officialTags}
          counts={tagCounts}
          resultLabel={resultLabel}
          streamLabel={streamLabel}
        />
      </div>

      {articles.length === 0 ? (
        <FeedEmpty q={q} hasTags={tags.length > 0} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
          <BookmarkBatchHydrator articleIds={articles.map((article) => article.id)} />
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
          key={`${stream}:${[...tags].sort().join(',')}:${q}`}
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
        <section className="sticky top-[var(--header-height)] z-40 -mx-4 -mt-4 mb-5 border-b border-border bg-rail/95 backdrop-blur-sm lg:-mx-6 lg:-mt-4">
          <div className="space-y-3 px-4 py-3 lg:px-6">
            <div className="h-12 w-72 animate-pulse rounded-xl bg-border/35" />
            <div className="h-10 w-full animate-pulse rounded-full bg-surface-raised/70" />
            <div className="h-4 w-40 animate-pulse rounded bg-border/35" />
          </div>
        </section>
        <div className="mb-6">
          <div className="h-8 w-full animate-pulse rounded-full bg-surface-raised" />
        </div>
        <FeedSkeleton count={6} />
      </>
    }>
      <FeedGrid searchParams={params} />
    </Suspense>
  )
}
