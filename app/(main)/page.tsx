import { redirect } from 'next/navigation'
import { unstable_noStore } from 'next/cache'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { resolveAuthUser } from '@/lib/supabase/resolve-auth-user'
import { getFeedPage } from '@/lib/queries/feed'
import { listOfficialTags } from '@/lib/queries/tags'
import { getTagCountsForStream } from '@/lib/queries/tag-counts'
import { getScopeCountsForStream } from '@/lib/queries/scope-counts'
import { getStreamArticleCounts } from '@/lib/queries/stream-counts'
import { getBookmarkedArticleIdsForUser } from '@/lib/queries/bookmarks'
import { ArticleCard } from '@/components/ui/article-card'
import { ArticleSkimRow } from '@/components/ui/article-skim-row'
import { FeedSkeleton } from '@/components/feed/feed-skeleton'
import { FEED_VIEW_STORAGE_KEY, isSkimFeedView } from '@/lib/feed/feed-view'
import {
  isScopeEnabledStream,
  normalizeTagsAndScope,
  type FeedScope,
} from '@/lib/feed/scope'
import { FeedPager } from '@/components/feed/feed-pager'
import { FeedEmpty } from '@/components/feed/feed-empty'
import { FeedTopBar } from '@/components/feed/feed-top-bar'
import {
  getStreamLabel,
  HOME_METADATA,
  parseContentStream,
  STREAM_INTRO_COPY,
} from '@/lib/copy/streams'
import { getDefaultOgImageUrl, getSiteUrl } from '@/lib/seo/site-url'

const homeOgImage = getDefaultOgImageUrl()

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const params = await searchParams
  const stream = parseContentStream(params.stream)
  const intro = STREAM_INTRO_COPY[stream]
  const title =
    stream === 'standard' ? HOME_METADATA.title : intro.title
  const description =
    stream === 'standard' ? HOME_METADATA.description : intro.tagline
  const ogDescription =
    stream === 'standard' ? HOME_METADATA.ogDescription : intro.mobileSummary

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description: ogDescription,
      url: stream === 'standard' ? getSiteUrl() : `${getSiteUrl()}/?stream=${stream}`,
      siteName: 'Nuggets',
      type: 'website',
      images: [
        {
          url: homeOgImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: ogDescription,
      images: [homeOgImage],
    },
  }
}

type SearchParams = {
  stream?: string
  scope?: string
  tags?: string
  q?: string
  view?: string
}

type Props = {
  searchParams: Promise<SearchParams>
}

const MAX_TAGS = 5
const MAX_Q_LENGTH = 200

function buildLegacyIndiaRedirectUrl(
  stream: ReturnType<typeof parseContentStream>,
  tags: string[],
  q: string,
  view?: string
): string {
  const params = new URLSearchParams()
  if (stream !== 'standard') params.set('stream', stream)
  params.set('scope', 'india')
  if (tags.length > 0) params.set('tags', tags.join(','))
  if (q) params.set('q', q)
  if (view) params.set('view', view)
  return `/?${params.toString()}`
}

async function FeedGrid({ searchParams }: { searchParams: SearchParams }) {
  const stream = parseContentStream(searchParams.stream)
  const tagsRaw = searchParams.tags ?? ''
  const parsedTags = tagsRaw
    ? tagsRaw
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0 && tag.length <= 80)
      .slice(0, MAX_TAGS)
    : []
  const q = (searchParams.q ?? '').trim().slice(0, MAX_Q_LENGTH)
  const { tags, scope, hadLegacyIndiaTag } = normalizeTagsAndScope(
    stream,
    parsedTags,
    searchParams.scope
  )

  if (hadLegacyIndiaTag && searchParams.scope !== 'india') {
    redirect(buildLegacyIndiaRedirectUrl(stream, tags, q, searchParams.view))
  }

  const cookieStore = await cookies()
  const storedFeedView = cookieStore.get(FEED_VIEW_STORAGE_KEY)?.value ?? null
  const skimView = isSkimFeedView(searchParams.view, storedFeedView)

  // Filtered or search URLs must never be served from stale ISR cache.
  const hasFilters = !!(tags.length > 0 || q || scope === 'india')
  if (hasFilters) {
    unstable_noStore()
  }

  const feedScope: FeedScope | undefined = isScopeEnabledStream(stream)
    ? scope ?? 'global'
    : undefined

  const [feedResult, officialTags, tagCounts, streamCounts, scopeCounts] =
    await Promise.all([
      getFeedPage({ stream, tags, q, scope: feedScope }).catch((error) => {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`FeedGrid getFeedPage error: ${message}`)
        return { articles: [], nextCursor: null, stream, totalCount: 0 }
      }),
      listOfficialTags().catch((error) => {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`FeedGrid listOfficialTags error: ${message}`)
        return []
      }),
      getTagCountsForStream(stream, feedScope).catch((error) => {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`FeedGrid getTagCountsForStream error: ${message}`)
        return {}
      }),
      getStreamArticleCounts().catch((error) => {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`FeedGrid getStreamArticleCounts error: ${message}`)
        return { standard: 0, pulse: 0, charts: 0 }
      }),
      isScopeEnabledStream(stream)
        ? getScopeCountsForStream(stream).catch((error) => {
            const message = error instanceof Error ? error.message : String(error)
            console.error(`FeedGrid getScopeCountsForStream error: ${message}`)
            return { global: 0, india: 0 }
          })
        : Promise.resolve(null),
    ])

  const { articles, nextCursor } = feedResult
  const totalCount =
    typeof feedResult.totalCount === 'number' ? feedResult.totalCount : undefined
  const streamLabel = getStreamLabel(stream)

  const supabase = await createClient()
  const { user } = await resolveAuthUser(supabase)
  const isAuthenticated = !!user
  const isAdmin = user?.app_metadata?.is_admin === true
  const articleIds = articles.map((a) => a.id)
  const bookmarkedIds =
    user && articleIds.length > 0
      ? await getBookmarkedArticleIdsForUser(user.id, articleIds)
      : new Set<string>()

  const scopeKey = feedScope ?? 'none'

  return (
    <>
      <FeedTopBar
        stream={stream}
        scope={feedScope}
        scopeCounts={scopeCounts}
        tags={officialTags}
        counts={tagCounts}
        streamCounts={streamCounts}
        streamLabel={streamLabel}
        shownCount={articles.length}
        totalCount={totalCount}
        skimView={skimView}
      />

      {articles.length === 0 ? (
        <FeedEmpty q={q} hasTags={tags.length > 0} />
      ) : skimView ? (
        <>
          <div className="-mx-4 flex flex-col md:hidden">
            {articles.map((article, index) => (
              <ArticleSkimRow
                key={article.id}
                article={article}
                priority={index === 0}
              />
            ))}
          </div>
          <div className="hidden grid-cols-1 gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
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
        </>
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
          key={`${stream}:${scopeKey}:${[...tags].sort().join(',')}:${q}:${skimView ? 'skim' : 'grid'}`}
          initialCursor={nextCursor}
          stream={stream}
          scope={feedScope}
          tags={tags}
          q={q}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          skimView={skimView}
        />
      )}
    </>
  )
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams
  const cookieStore = await cookies()
  const storedFeedView = cookieStore.get(FEED_VIEW_STORAGE_KEY)?.value ?? null
  const skimView = isSkimFeedView(params.view, storedFeedView)

  return (
    <Suspense
      fallback={
        <>
          <div className="-mx-4 -mt-6 mb-5 lg:-mx-6">
            <div className="min-h-[44px] border-b border-border bg-header px-4 pt-2 backdrop-blur-sm lg:px-6">
              <div className="flex h-11 w-full gap-1 sm:inline-flex sm:w-auto lg:w-[32rem]">
                <div className="h-9 min-h-[44px] flex-1 animate-pulse rounded-md bg-border/40 sm:flex-none sm:h-9 sm:w-24 lg:flex-1 lg:basis-0 lg:min-w-0" />
                <div className="h-9 min-h-[44px] flex-1 animate-pulse rounded-md bg-border/40 sm:flex-none sm:h-9 sm:w-36 lg:flex-1 lg:basis-0 lg:min-w-0" />
                <div className="h-9 min-h-[44px] flex-1 animate-pulse rounded-md bg-border/40 sm:flex-none sm:h-9 sm:w-28 lg:flex-1 lg:basis-0 lg:min-w-0" />
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
              {skimView ? (
                <div className="h-3.5 w-40 animate-pulse rounded bg-border/30 md:hidden" />
              ) : (
                <>
                  <div className="h-5 max-w-[62ch] animate-pulse rounded bg-border/35" />
                  <div className="h-3.5 max-w-[62ch] animate-pulse rounded bg-border/30" />
                  <div className="h-3.5 w-40 animate-pulse rounded bg-border/30" />
                </>
              )}
            </div>
          </div>
          <FeedSkeleton count={skimView ? 8 : 6} skimView={skimView} />
        </>
      }
    >
      <FeedGrid searchParams={params} />
    </Suspense>
  )
}
