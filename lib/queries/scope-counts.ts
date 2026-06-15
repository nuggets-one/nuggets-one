import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { INDIA_SUBTOPIC_SLUG } from '@/lib/feed/scope'
import { getPublicClient } from '@/lib/supabase/public'
import type { ContentStream } from '@/types/article'

export type ScopeCounts = { global: number; india: number }

const PENDING_MIGRATION_CODES = new Set(['PGRST205', '42P01'])

async function fetchScopeCountsForStream(stream: ContentStream): Promise<ScopeCounts> {
  const supabase = getPublicClient()

  const base = () =>
    supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('content_stream', stream)

  const [globalResult, indiaResult] = await Promise.all([
    base().not('tag_slugs', 'cs', `{${INDIA_SUBTOPIC_SLUG}}`),
    base().contains('tag_slugs', [INDIA_SUBTOPIC_SLUG]),
  ])

  if (globalResult.error && !PENDING_MIGRATION_CODES.has(globalResult.error.code ?? '')) {
    console.error('fetchScopeCountsForStream global:', globalResult.error.message)
  }
  if (indiaResult.error && !PENDING_MIGRATION_CODES.has(indiaResult.error.code ?? '')) {
    console.error('fetchScopeCountsForStream india:', indiaResult.error.message)
  }

  return {
    global: globalResult.count ?? 0,
    india: indiaResult.count ?? 0,
  }
}

const cachedStandardScopeCounts = unstable_cache(
  () => fetchScopeCountsForStream('standard'),
  ['scope-counts', 'standard'],
  { revalidate: 3600, tags: [CACHE_TAGS.scopeCounts('standard')] }
)

const cachedPulseScopeCounts = unstable_cache(
  () => fetchScopeCountsForStream('pulse'),
  ['scope-counts', 'pulse'],
  { revalidate: 3600, tags: [CACHE_TAGS.scopeCounts('pulse')] }
)

/**
 * Published article totals per scope for Nuggets or Market Pulse.
 */
export async function getScopeCountsForStream(
  stream: 'standard' | 'pulse'
): Promise<ScopeCounts> {
  if (stream === 'pulse') return cachedPulseScopeCounts()
  return cachedStandardScopeCounts()
}
