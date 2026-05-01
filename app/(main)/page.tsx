import type { Metadata } from 'next'
import Link from 'next/link'
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
import { getFeedPage } from '@/lib/queries/feed'
import { listOfficialTags } from '@/lib/queries/tags'
import { ArticleCard } from '@/components/ui/article-card'
import { BookmarkBatchHydrator } from '@/components/ui/bookmark-batch-hydrator'
import { FeedSkeleton } from '@/components/feed/feed-skeleton'
import { FeedPager } from '@/components/feed/feed-pager'
import { FeedEmpty } from '@/components/feed/feed-empty'
import { StreamTabs } from '@/components/feed/stream-tabs'
import { TagChipRail } from '@/components/feed/tag-chip-rail'
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

  const [feedResult, officialTags] = await Promise.all([
    hasFilters
      ? getFeedPage({ stream, tags, q })
      : getFeedPage({ stream, tags: [], q: '' }),
    listOfficialTags(),
  ])

  const { articles, nextCursor } = feedResult
  const streamLabel = stream === 'pulse' ? 'Market Pulse' : 'Nuggets'
  const resultLabel = `${articles.length} result${articles.length === 1 ? '' : 's'}`
  const contextParts = [
    streamLabel,
    q ? `Search: "${q}"` : null,
    tags.length ? `${tags.length} tag filter${tags.length === 1 ? '' : 's'}` : null,
  ].filter(Boolean)

  // Batch bookmark check — BLUEPRINT: "one batched GET per feed page (24 IDs max)"
  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <StreamTabs />
        <p className="text-xs text-muted">
          Filter by{' '}
          <span className="font-medium text-primary/85">topics</span> below. Explore curated sets on{' '}
          <Link
            href="/collections"
            className="font-medium text-primary underline underline-offset-2 decoration-primary/70 hover:text-primary"
          >
            Collections
          </Link>
          .
        </p>
        <TagChipRail tags={officialTags} />
        <p className="text-xs text-muted">
          <span className="font-medium text-primary/85">{resultLabel}</span>
          <span className="mx-1.5 text-muted/70">|</span>
          <span>{contextParts.join(' · ')}</span>
        </p>
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
              initialBookmarked={false}
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
