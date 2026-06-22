// scripts/migrate/backfill-visible-streams.ts
// Recompute visible_streams for all articles (idempotent after migration 034).
// Run: npm exec tsx scripts/migrate/backfill-visible-streams.ts [--dry-run]

import { db } from './supabase-client'
import type { ContentStream } from '../../types/article'

const isDryRun = process.argv.includes('--dry-run')

const STREAMS: ContentStream[] = [
  'standard',
  'pulse',
  'charts',
  'tech_vc',
  'geopolitics',
  'leadership',
]

async function countByVisibleStream(stream: ContentStream): Promise<number> {
  const { count, error } = await db
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .contains('visible_streams', [stream])

  if (error) throw new Error(`countByVisibleStream(${stream}): ${error.message}`)
  return count ?? 0
}

async function recomputeAll(): Promise<number> {
  const pageSize = 500
  let from = 0
  let processed = 0

  while (true) {
    const { data, error: fetchError } = await db
      .from('articles')
      .select('id')
      .range(from, from + pageSize - 1)

    if (fetchError) throw new Error(`fetch articles: ${fetchError.message}`)

    const batch = (data ?? []) as { id: string }[]
    for (const row of batch) {
      if (!isDryRun) {
        const { error: rpcError } = await db.rpc('recompute_visible_streams', {
          p_article_id: row.id,
        })
        if (rpcError) {
          throw new Error(`recompute_visible_streams(${row.id}): ${rpcError.message}`)
        }
      }
      processed += 1
    }

    if (batch.length < pageSize) break
    from += pageSize
  }

  return processed
}

async function main() {
  console.log(`[backfill-visible-streams] dry-run=${isDryRun}`)

  console.log('[backfill-visible-streams] counts before:')
  for (const stream of STREAMS) {
    console.log(`  ${stream}: ${await countByVisibleStream(stream)}`)
  }

  const processed = await recomputeAll()
  console.log(
    `[backfill-visible-streams] ${isDryRun ? 'would recompute' : 'recomputed'} ${processed} articles`,
  )

  if (!isDryRun) {
    console.log('[backfill-visible-streams] counts after:')
    for (const stream of STREAMS) {
      console.log(`  ${stream}: ${await countByVisibleStream(stream)}`)
    }
  }
}

main().catch((error) => {
  console.error('[backfill-visible-streams] failed:', error)
  process.exit(1)
})
