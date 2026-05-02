import { unstable_cache } from 'next/cache'
import { getPublicClient } from '@/lib/supabase/public'
import type { ContentStream } from '@/types/article'

export type TagCounts = Record<string, number>

const PENDING_MIGRATION_CODES = new Set(['PGRST205', '42P01'])

async function fetchTagCountsForStream(
  stream: ContentStream
): Promise<TagCounts> {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('articles')
    .select('tag_slugs')
    .eq('status', 'published')
    .eq('content_stream', stream)

  if (error) {
    if (!PENDING_MIGRATION_CODES.has(error.code ?? '')) {
      console.error('fetchTagCountsForStream:', error.message)
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

const cachedStandardTagCounts = unstable_cache(
  () => fetchTagCountsForStream('standard'),
  ['tag-counts', 'standard'],
  { revalidate: 3600 }
)

const cachedPulseTagCounts = unstable_cache(
  () => fetchTagCountsForStream('pulse'),
  ['tag-counts', 'pulse'],
  { revalidate: 3600 }
)

/**
 * Slug → count of published articles in the given stream.
 * Cached for 1h; recomputed on cache miss via a single in-memory aggregation
 * over `articles.tag_slugs`. Equivalent to
 * `select unnest(tag_slugs), count(*) from articles where status='published'
 * and content_stream=$1 group by 1`, computed in JS to avoid an RPC migration.
 */
export async function getTagCountsForStream(
  stream: ContentStream
): Promise<TagCounts> {
  return stream === 'pulse'
    ? cachedPulseTagCounts()
    : cachedStandardTagCounts()
}
