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
import { FeedLoadingChrome } from '@/components/feed/feed-loading-chrome'
import { FeedSkeleton } from '@/components/feed/feed-skeleton'
import { FEED_VIEW_STORAGE_KEY, isSkimFeedView } from '@/lib/feed/feed-view'
import {
  buildHomeHref,
  effectiveFeedScope,
  isPulseChartsScope,
  isScopeEnabledStream,
  normalizeTagsAndScope,
  parseFeedScope,
  type FeedScope,
} from '@/lib/feed/scope'
import { FeedPager } from '@/components/feed/feed-pager'
import { FeedEmpty } from '@/components/feed/feed-empty'
import { FeedTopBar } from '@/components/feed/feed-top-bar'
import { FeedContentPendingGate } from '@/components/feed/feed-content-pending-gate'
import {
  getStreamLabel,
  parseContentStream,
  STREAM_INTRO_COPY,
} from '@/lib/copy/streams'
import { DEFAULT_STREAM } from '@/types/article'
import { getDefaultOgImageUrl, getSiteUrl } from '@/lib/seo/site-url'

const homeOgImage = getDefaultOgImageUrl()

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const params = await searchParams
  const stream = parseContentStream(params.stream)
  const scope = parseFeedScope(params.scope)
  const isPulseCharts = isPulseChartsScope(stream, scope)
  const metaStream = isPulseCharts ? 'charts' : stream
  const intro = STREAM_INTRO_COPY[metaStream]
  const title = intro.title
  const description = intro.tagline
  const ogDescription = intro.mobileSummary

  const canonicalPath = buildHomeHref(
    stream,
    isPulseCharts ? 'charts' : scope !== 'global' ? scope : undefined,
  )
  const canonicalUrl = `${getSiteUrl()}${canonicalPath === '/' ? '' : canonicalPath}`

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description: ogDescription,
      url: canonicalUrl,
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

function buildLegacyChartsRedirectUrl(
  tags: string[],
  q: string,
  view?: string
): string {
  const params = new URLSearchParams()
  params.set('stream', 'pulse')
  params.set('scope', 'charts')
  if (tags.length > 0) params.set('tags', tags.join(','))
  if (q) params.set('q', q)
  if (view) params.set('view', view)
  return `/?${params.toString()}`
}

function buildLegacyIndiaRedirectUrl(
  stream: ReturnType<typeof parseContentStream>,
  tags: string[],
  q: string,
  view?: string
): string {
  const params = new URLSearchParams()
  if (stream !== DEFAULT_STREAM) params.set('stream', stream)
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

  if (
    searchParams.stream === 'pulse' &&
    !searchParams.scope &&
    !parsedTags.length &&
    !q
  ) {
    redirect('/')
  }

  if (stream === 'charts') {
    redirect(buildLegacyChartsRedirectUrl(parsedTags, q, searchParams.view))
  }

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

  // Home feed must always reflect current DB state (avoid stale ISR empty pages).
  unstable_noStore()

  const feedScope: FeedScope | undefined = isScopeEnabledStream(stream)
    ? effectiveFeedScope(stream, scope)
    : undefined

  let feedLoadFailed = false

  const [feedResult, officialTags, tagCounts, streamCounts, scopeCounts] =
    await Promise.all([
      getFeedPage({ stream, tags, q, scope: feedScope }).catch((error) => {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`FeedGrid getFeedPage error: ${message}`)
        feedLoadFailed = true
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
        return { standard: 0, pulse: 0, charts: 0, tech_vc: 0, geopolitics: 0, leadership: 0 }
      }),
      isScopeEnabledStream(stream)
        ? getScopeCountsForStream(stream).catch((error) => {
            const message = error instanceof Error ? error.message : String(error)
            console.error(`FeedGrid getScopeCountsForStream error: ${message}`)
            return { global: 0, india: 0, charts: 0 }
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
  const feedContentKey = `${stream}:${scopeKey}:${[...tags].sort().join(',')}:${q}:${skimView ? 'skim' : 'grid'}`

  return (
    <FeedContentPendingGate contentKey={feedContentKey}>
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

      {feedLoadFailed ? (
          <FeedEmpty q={q} hasTags={tags.length > 0} unavailable />
        ) : articles.length === 0 ? (
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
    </FeedContentPendingGate>
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
          <FeedLoadingChrome skimView={skimView} />
          <FeedSkeleton count={skimView ? 8 : 6} skimView={skimView} />
        </>
      }
    >
      <FeedGrid searchParams={params} />
    </Suspense>
  )
}
