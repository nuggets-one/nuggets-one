import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache'
import { INDIA_SUBTOPIC_SLUG, applyVisibleStreamFilter } from '@/lib/feed/scope'
import { getPublicClient } from '@/lib/supabase/public'
import type { ContentStream } from '@/types/article'

export type ScopeCounts = { global: number; india: number; charts: number }

const PENDING_MIGRATION_CODES = new Set(['PGRST205', '42P01'])

async function fetchChartsStreamCount(): Promise<number> {
  const supabase = getPublicClient()
  const { count, error } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .contains('visible_streams', ['charts'])

  if (error && !PENDING_MIGRATION_CODES.has(error.code ?? '')) {
    console.error('fetchChartsStreamCount:', error.message)
  }
  return count ?? 0
}

async function fetchScopeCountsForStream(
  stream: ContentStream
): Promise<Pick<ScopeCounts, 'global' | 'india'>> {
  const supabase = getPublicClient()

  const base = () =>
    applyVisibleStreamFilter(
      supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
      stream
    )

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

const cachedChartsScopeCount = unstable_cache(
  fetchChartsStreamCount,
  ['scope-counts', 'charts'],
  { revalidate: 3600, tags: [CACHE_TAGS.scopeCounts('charts')] }
)

const cachedStandardScopeCounts = unstable_cache(
  async () => {
    const counts = await fetchScopeCountsForStream('standard')
    return { ...counts, charts: 0 }
  },
  ['scope-counts', 'standard'],
  { revalidate: 3600, tags: [CACHE_TAGS.scopeCounts('standard')] }
)

const cachedPulseScopeCounts = unstable_cache(
  async () => {
    const [counts, charts] = await Promise.all([
      fetchScopeCountsForStream('pulse'),
      cachedChartsScopeCount(),
    ])
    return { ...counts, charts }
  },
  ['scope-counts', 'pulse'],
  { revalidate: 3600, tags: [CACHE_TAGS.scopeCounts('pulse')] }
)

const cachedTechVcScopeCounts = unstable_cache(
  async () => {
    const counts = await fetchScopeCountsForStream('tech_vc')
    return { ...counts, charts: 0 }
  },
  ['scope-counts', 'tech_vc'],
  { revalidate: 3600, tags: [CACHE_TAGS.scopeCounts('tech_vc')] }
)

/**
 * Published article totals per scope for Nuggets, Market Pulse, or Tech x VC.
 */
export async function getScopeCountsForStream(
  stream: 'standard' | 'pulse' | 'tech_vc'
): Promise<ScopeCounts> {
  if (stream === 'pulse') return cachedPulseScopeCounts()
  if (stream === 'tech_vc') return cachedTechVcScopeCounts()
  return cachedStandardScopeCounts()
}
