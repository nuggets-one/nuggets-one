import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import {
  applyFeedScopeFilter,
  applyVisibleStreamFilter,
  effectiveFeedScope,
  isFeedAllStream,
  isPulseChartsScope,
  resolveEffectiveContentStream,
} from '@/lib/feed/scope'
import type { FeedScope } from '@/lib/feed/scope'
import { getPublicClient } from '@/lib/supabase/public'
import type { ContentStream, FeedStream } from '@/types/article'

export type TagCounts = Record<string, number>

const PENDING_MIGRATION_CODES = new Set(['PGRST205', '42P01'])

async function fetchTagCountsForFeedStream(
  stream: FeedStream,
  scope?: FeedScope
): Promise<TagCounts> {
  const supabase = getPublicClient()
  const effectiveScope = effectiveFeedScope(stream, scope)
  const effectiveStream = resolveEffectiveContentStream(stream, scope)

  let query = supabase
    .from('articles')
    .select('tag_slugs')
    .eq('status', 'published')

  if (!isFeedAllStream(effectiveStream)) {
    query = applyVisibleStreamFilter(query, effectiveStream)
  }

  query = applyFeedScopeFilter(query, stream, effectiveScope)

  const { data, error } = await query

  if (error) {
    if (!PENDING_MIGRATION_CODES.has(error.code ?? '')) {
      console.error('fetchTagCountsForFeedStream:', error.message)
    }
    return {}
  }

  const rows = data as { tag_slugs: string[] | null }[] | null
  const counts: TagCounts = {}
  for (const row of rows ?? []) {
    const slugs = row.tag_slugs ?? []
    for (const slug of slugs) {
      if (typeof slug === 'string' && slug.length > 0) {
        counts[slug] = (counts[slug] ?? 0) + 1
      }
    }
  }

  return counts
}

function cacheKey(stream: FeedStream | ContentStream, scope: FeedScope | 'all'): string {
  return `tag-counts:${stream}:${scope}`
}

const cachedAllGlobalTagCounts = unstable_cache(
  () => fetchTagCountsForFeedStream('all', 'global'),
  [cacheKey('all', 'global')],
  { revalidate: 3600, tags: [CACHE_TAGS.tagCounts('all:global')] }
)

const cachedAllIndiaTagCounts = unstable_cache(
  () => fetchTagCountsForFeedStream('all', 'india'),
  [cacheKey('all', 'india')],
  { revalidate: 3600, tags: [CACHE_TAGS.tagCounts('all:india')] }
)

const cachedStandardGlobalTagCounts = unstable_cache(
  () => fetchTagCountsForFeedStream('standard', 'global'),
  [cacheKey('standard', 'global')],
  { revalidate: 3600, tags: [CACHE_TAGS.tagCounts('standard:global')] }
)

const cachedStandardIndiaTagCounts = unstable_cache(
  () => fetchTagCountsForFeedStream('standard', 'india'),
  [cacheKey('standard', 'india')],
  { revalidate: 3600, tags: [CACHE_TAGS.tagCounts('standard:india')] }
)

const cachedPulseGlobalTagCounts = unstable_cache(
  () => fetchTagCountsForFeedStream('pulse', 'global'),
  [cacheKey('pulse', 'global')],
  { revalidate: 3600, tags: [CACHE_TAGS.tagCounts('pulse:global')] }
)

const cachedPulseIndiaTagCounts = unstable_cache(
  () => fetchTagCountsForFeedStream('pulse', 'india'),
  [cacheKey('pulse', 'india')],
  { revalidate: 3600, tags: [CACHE_TAGS.tagCounts('pulse:india')] }
)

const cachedChartsTagCounts = unstable_cache(
  () => fetchTagCountsForFeedStream('charts'),
  [cacheKey('charts', 'all')],
  { revalidate: 3600, tags: [CACHE_TAGS.tagCounts('charts')] }
)

const cachedTechVcGlobalTagCounts = unstable_cache(
  () => fetchTagCountsForFeedStream('tech_vc', 'global'),
  [cacheKey('tech_vc', 'global')],
  { revalidate: 3600, tags: [CACHE_TAGS.tagCounts('tech_vc:global')] }
)

const cachedTechVcIndiaTagCounts = unstable_cache(
  () => fetchTagCountsForFeedStream('tech_vc', 'india'),
  [cacheKey('tech_vc', 'india')],
  { revalidate: 3600, tags: [CACHE_TAGS.tagCounts('tech_vc:india')] }
)

const cachedGeopoliticsTagCounts = unstable_cache(
  () => fetchTagCountsForFeedStream('geopolitics'),
  [cacheKey('geopolitics', 'all')],
  { revalidate: 3600, tags: [CACHE_TAGS.tagCounts('geopolitics')] }
)

const cachedLeadershipTagCounts = unstable_cache(
  () => fetchTagCountsForFeedStream('leadership'),
  [cacheKey('leadership', 'all')],
  { revalidate: 3600, tags: [CACHE_TAGS.tagCounts('leadership')] }
)

/**
 * Slug → count of published articles in the given stream (optionally scoped).
 * Cached for 1h; recomputed on cache miss via a single in-memory aggregation
 * over `articles.tag_slugs`.
 */
export async function getTagCountsForStream(
  stream: FeedStream,
  scope?: FeedScope
): Promise<TagCounts> {
  if (stream === 'all') {
    const effectiveScope = effectiveFeedScope(stream, scope) ?? 'global'
    return effectiveScope === 'india'
      ? cachedAllIndiaTagCounts()
      : cachedAllGlobalTagCounts()
  }
  if (stream === 'charts') return cachedChartsTagCounts()
  if (stream === 'geopolitics') return cachedGeopoliticsTagCounts()
  if (stream === 'leadership') return cachedLeadershipTagCounts()
  if (isPulseChartsScope(stream, scope)) return cachedChartsTagCounts()
  const effectiveScope = effectiveFeedScope(stream, scope) ?? 'global'
  if (stream === 'pulse') {
    return effectiveScope === 'india'
      ? cachedPulseIndiaTagCounts()
      : cachedPulseGlobalTagCounts()
  }
  if (stream === 'tech_vc') {
    return effectiveScope === 'india'
      ? cachedTechVcIndiaTagCounts()
      : cachedTechVcGlobalTagCounts()
  }
  return effectiveScope === 'india'
    ? cachedStandardIndiaTagCounts()
    : cachedStandardGlobalTagCounts()
}
