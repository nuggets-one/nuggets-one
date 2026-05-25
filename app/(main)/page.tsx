import { unstable_noStore } from 'next/cache'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getFeedPage } from '@/lib/queries/feed'
import { listOfficialTags } from '@/lib/queries/tags'
import { getTagCountsForStream } from '@/lib/queries/tag-counts'
import { getStreamArticleCounts } from '@/lib/queries/stream-counts'
import { getBookmarkedArticleIdsForUser } from '@/lib/queries/bookmarks'
import { ArticleCard } from '@/components/ui/article-card'
import { FeedSkeleton } from '@/components/feed/feed-skeleton'
import { FeedPager } from '@/components/feed/feed-pager'
import { FeedEmpty } from '@/components/feed/feed-empty'
import { FeedTopBar } from '@/components/feed/feed-top-bar'
import { DEFAULT_STREAM } from '@/types/article'
import type { ContentStream } from '@/types/article'
import { getDefaultOgImageUrl, getSiteUrl } from '@/lib/seo/site-url'

const HOME_TITLE = 'Nuggets: The Knowledge App'
const HOME_DESCRIPTION =
  'Hand-curated reads across technology, markets, and ideas. Standard and Market Pulse streams.'
const homeOgImage = getDefaultOgImageUrl()

export const metadata: Metadata = {
  title: {
    absolute: HOME_TITLE,
  },
  description: HOME_DESCRIPTION,
  openGraph: {
    title: HOME_TITLE,
    description: 'Hand-curated reads across technology, markets, and ideas.',
    url: getSiteUrl(),
    siteName: 'Nuggets',
    type: 'website',
    images: [{ url: homeOgImage, width: 1200, height: 630, alt: HOME_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: 'Hand-curated reads across technology, markets, and ideas.',
    images: [homeOgImage],
  },
}

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

  const [feedResult, officialTags, tagCounts, streamCounts] = await Promise.all([
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
    getStreamArticleCounts().catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`FeedGrid getStreamArticleCounts error: ${message}`)
      return { standard: 0, pulse: 0 }
    }),
  ])

  const { articles, nextCursor } = feedResult
  const totalCount = typeof feedResult.totalCount === 'number' ? feedResult.totalCount : articles.length
  const streamLabel = stream === 'pulse' ? 'Market Pulse' : 'Nuggets'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthenticated = !!user
  const isAdmin = user?.app_metadata?.is_admin === true
  const articleIds = articles.map((a) => a.id)
  const bookmarkedIds =
    user && articleIds.length > 0
      ? await getBookmarkedArticleIdsForUser(user.id, articleIds)
      : new Set<string>()

  // First page: bookmark state comes from the server (getBookmarkedArticleIdsForUser).
  // Client batch hydrator runs only inside FeedPager for paginated rows.
  return (
    <>
      <FeedTopBar
        stream={stream}
        tags={officialTags}
        counts={tagCounts}
        streamCounts={streamCounts}
        streamLabel={streamLabel}
        shownCount={articles.length}
        totalCount={totalCount}
      />

      {articles.length === 0 ? (
        <FeedEmpty q={q} hasTags={tags.length > 0} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
          {articles.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              priority={index === 0}
              isAuthenticated={isAuthenticated}
              initialBookmarked={bookmarkedIds.has(article.id)}
              adminEditHref={
                isAdmin ? `/admin/articles/${article.id}` : null
              }
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
          isAdmin={isAdmin}
        />
      )}
    </>
  )
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams

  return (
    <Suspense
      fallback={
        <>
          <div className="-mx-4 -mt-6 mb-5 lg:-mx-6">
            <div className="min-h-[44px] border-b border-border bg-header px-4 pt-2 backdrop-blur-sm lg:px-6">
              <div className="flex h-11 w-full gap-1 sm:inline-flex sm:w-auto lg:w-[22rem]">
                <div className="h-9 min-h-[44px] flex-1 animate-pulse rounded-md bg-border/40 sm:flex-none sm:h-9 sm:w-24 lg:flex-1 lg:basis-0 lg:min-w-0" />
                <div className="h-9 min-h-[44px] flex-1 animate-pulse rounded-md bg-border/40 sm:flex-none sm:h-9 sm:w-36 lg:flex-1 lg:basis-0 lg:min-w-0" />
              </div>
            </div>
            <section className="sticky top-[var(--header-height)] z-40 min-h-[88px] border-b border-border bg-rail/95 backdrop-blur-sm">
              <div className="space-y-3 px-4 py-3 lg:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="h-9 w-16 animate-pulse rounded-full bg-surface-raised/70" />
                  <div className="h-10 w-32 animate-pulse rounded-full bg-surface-raised/70" />
                </div>
                <div className="h-4 w-48 animate-pulse rounded bg-border/35" />
              </div>
            </section>
            <div className="space-y-1.5 px-4 pb-0.5 pt-2 lg:px-6">
              <div className="h-5 max-w-[62ch] animate-pulse rounded bg-border/35" />
              <div className="h-3.5 max-w-[62ch] animate-pulse rounded bg-border/30" />
              <div className="h-3.5 w-40 animate-pulse rounded bg-border/30" />
            </div>
          </div>
          <FeedSkeleton count={6} />
        </>
      }
    >
      <FeedGrid searchParams={params} />
    </Suspense>
  )
}
