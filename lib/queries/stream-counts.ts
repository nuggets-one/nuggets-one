import { unstable_cache } from 'next/cache'
import { getPublicClient } from '@/lib/supabase/public'
import type { ContentStream } from '@/types/article'

export type StreamArticleCounts = { standard: number; pulse: number }

const PENDING_MIGRATION_CODES = new Set(['PGRST205', '42P01'])

async function fetchStreamArticleCount(stream: ContentStream): Promise<number> {
  const supabase = getPublicClient()

  const { count, error } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .eq('content_stream', stream)

  if (error) {
    if (!PENDING_MIGRATION_CODES.has(error.code ?? '')) {
      console.error('fetchStreamArticleCount:', error.message)
    }
    return 0
  }

  return count ?? 0
}

async function fetchStreamArticleCounts(): Promise<StreamArticleCounts> {
  const [standard, pulse] = await Promise.all([
    fetchStreamArticleCount('standard'),
    fetchStreamArticleCount('pulse'),
  ])
  return { standard, pulse }
}

const cachedStreamArticleCounts = unstable_cache(
  fetchStreamArticleCounts,
  ['stream-counts'],
  { revalidate: 3600 }
)

/**
 * Published article totals per content stream (unfiltered).
 * Cached for 1h; two head-count queries on cache miss.
 */
export async function getStreamArticleCounts(): Promise<StreamArticleCounts> {
  return cachedStreamArticleCounts()
}
