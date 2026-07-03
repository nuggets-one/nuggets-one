import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { getPublicClient } from '@/lib/supabase/public'
import type { ContentStream } from '@/types/article'

export type StreamArticleCounts = {
  all: number
  standard: number
  pulse: number
  charts: number
  tech_vc: number
  geopolitics: number
  leadership: number
}

const PENDING_MIGRATION_CODES = new Set(['PGRST205', '42P01'])

async function fetchAllPublishedCount(): Promise<number> {
  const supabase = getPublicClient()

  const { count, error } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')

  if (error) {
    if (!PENDING_MIGRATION_CODES.has(error.code ?? '')) {
      console.error('fetchAllPublishedCount:', error.message)
    }
    return 0
  }

  return count ?? 0
}

async function fetchStreamArticleCount(stream: ContentStream): Promise<number> {
  const supabase = getPublicClient()

  const { count, error } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .contains('visible_streams', [stream])

  if (error) {
    if (!PENDING_MIGRATION_CODES.has(error.code ?? '')) {
      console.error('fetchStreamArticleCount:', error.message)
    }
    return 0
  }

  return count ?? 0
}

async function fetchStreamArticleCounts(): Promise<StreamArticleCounts> {
  const [all, standard, pulse, charts, tech_vc, geopolitics, leadership] = await Promise.all([
    fetchAllPublishedCount(),
    fetchStreamArticleCount('standard'),
    fetchStreamArticleCount('pulse'),
    fetchStreamArticleCount('charts'),
    fetchStreamArticleCount('tech_vc'),
    fetchStreamArticleCount('geopolitics'),
    fetchStreamArticleCount('leadership'),
  ])
  return { all, standard, pulse, charts, tech_vc, geopolitics, leadership }
}

const cachedStreamArticleCounts = unstable_cache(
  fetchStreamArticleCounts,
  ['stream-counts'],
  { revalidate: 3600, tags: [CACHE_TAGS.streamCounts] }
)

/**
 * Published article totals per feed stream (unfiltered).
 * Cached for 1h; recomputed on cache miss.
 */
export async function getStreamArticleCounts(): Promise<StreamArticleCounts> {
  return cachedStreamArticleCounts()
}
