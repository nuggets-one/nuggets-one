// scripts/migrate/backfill-streams-leadership.ts
// Move qualifying standard-stream articles into leadership stream.
// Run: npm exec tsx scripts/migrate/backfill-streams-leadership.ts [--dry-run]

import { db } from './supabase-client'
import { LEADERSHIP_TAG_SLUG } from '../../lib/feed/stream-membership'

const isDryRun = process.argv.includes('--dry-run')

type ArticleRow = { id: string; title: string; tag_slugs: string[] | null }

async function fetchStandardArticlesWithLeadershipTag(): Promise<ArticleRow[]> {
  const rows: ArticleRow[] = []
  const pageSize = 500
  let from = 0

  while (true) {
    const { data, error } = await db
      .from('articles')
      .select('id, title, tag_slugs')
      .eq('content_stream', 'standard')
      .contains('tag_slugs', [LEADERSHIP_TAG_SLUG])
      .range(from, from + pageSize - 1)

    if (error) throw new Error(`fetchStandardArticlesWithLeadershipTag: ${error.message}`)

    const batch = (data ?? []) as ArticleRow[]
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  return rows
}

async function updateStream(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  if (isDryRun) return ids.length

  let updated = 0
  const chunkSize = 100
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const { error } = await db
      .from('articles')
      .update({ content_stream: 'leadership' })
      .in('id', chunk)

    if (error) throw new Error(`updateStream(leadership): ${error.message}`)
    updated += chunk.length
  }

  return updated
}

async function main() {
  console.log(`[backfill-streams-leadership] dry-run=${isDryRun}`)

  const leadershipRows = await fetchStandardArticlesWithLeadershipTag()
  console.log(`[backfill-streams-leadership] leadership candidates: ${leadershipRows.length}`)

  for (const row of leadershipRows.slice(0, 20)) {
    console.log(`  - ${row.id} :: ${row.title}`)
  }
  if (leadershipRows.length > 20) {
    console.log(`  ... and ${leadershipRows.length - 20} more`)
  }

  const leadershipUpdated = await updateStream(leadershipRows.map((row) => row.id))
  console.log(
    `[backfill-streams-leadership] leadership ${isDryRun ? 'would update' : 'updated'}: ${leadershipUpdated}`,
  )
}

main().catch((error) => {
  console.error('[backfill-streams-leadership] failed:', error)
  process.exit(1)
})
