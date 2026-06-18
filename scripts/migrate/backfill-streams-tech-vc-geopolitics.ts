// scripts/migrate/backfill-streams-tech-vc-geopolitics.ts
// Move qualifying standard-stream articles into tech_vc and geopolitics streams.
// Run: npm exec tsx scripts/migrate/backfill-streams-tech-vc-geopolitics.ts [--dry-run]

import { db } from './supabase-client'
import {
  GEOPOLITICS_TAG_SLUG,
  TECH_VC_TAG_SLUGS,
} from '../../lib/feed/stream-membership'

const isDryRun = process.argv.includes('--dry-run')
const TECH_VC_TAGS = [...TECH_VC_TAG_SLUGS]

type ArticleRow = { id: string; title: string; tag_slugs: string[] | null }

async function fetchStandardArticlesMatching(
  predicate: (query: ReturnType<typeof db.from>) => ReturnType<typeof db.from>
): Promise<ArticleRow[]> {
  const rows: ArticleRow[] = []
  const pageSize = 500
  let from = 0

  while (true) {
    let query = db
      .from('articles')
      .select('id, title, tag_slugs')
      .eq('content_stream', 'standard')
      .range(from, from + pageSize - 1)

    query = predicate(query)

    const { data, error } = await query
    if (error) throw new Error(`fetchStandardArticlesMatching: ${error.message}`)

    const batch = (data ?? []) as ArticleRow[]
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  return rows
}

async function updateStream(ids: string[], stream: 'geopolitics' | 'tech_vc'): Promise<number> {
  if (ids.length === 0) return 0
  if (isDryRun) return ids.length

  let updated = 0
  const chunkSize = 100
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const { error } = await db
      .from('articles')
      .update({ content_stream: stream })
      .in('id', chunk)

    if (error) throw new Error(`updateStream(${stream}): ${error.message}`)
    updated += chunk.length
  }

  return updated
}

async function main() {
  console.log(`[backfill-streams] dry-run=${isDryRun}`)

  const dualTagged = await fetchStandardArticlesMatching((query) =>
    query
      .contains('tag_slugs', [GEOPOLITICS_TAG_SLUG])
      .overlaps('tag_slugs', TECH_VC_TAGS)
  )

  if (dualTagged.length > 0) {
    console.log(
      `[backfill-streams] ${dualTagged.length} articles tagged both Geopolitics and Tech x VC (Geopolitics wins):`
    )
    for (const row of dualTagged.slice(0, 20)) {
      console.log(`  - ${row.id} :: ${row.title}`)
    }
    if (dualTagged.length > 20) {
      console.log(`  ... and ${dualTagged.length - 20} more`)
    }
  }

  const geopoliticsRows = await fetchStandardArticlesMatching((query) =>
    query.contains('tag_slugs', [GEOPOLITICS_TAG_SLUG])
  )
  console.log(`[backfill-streams] geopolitics candidates: ${geopoliticsRows.length}`)
  const geopoliticsUpdated = await updateStream(
    geopoliticsRows.map((row) => row.id),
    'geopolitics'
  )
  console.log(
    `[backfill-streams] geopolitics ${isDryRun ? 'would update' : 'updated'}: ${geopoliticsUpdated}`
  )

  const techVcRows = await fetchStandardArticlesMatching((query) =>
    query.overlaps('tag_slugs', TECH_VC_TAGS)
  )
  console.log(`[backfill-streams] tech_vc candidates: ${techVcRows.length}`)
  const techVcUpdated = await updateStream(
    techVcRows.map((row) => row.id),
    'tech_vc'
  )
  console.log(`[backfill-streams] tech_vc ${isDryRun ? 'would update' : 'updated'}: ${techVcUpdated}`)
}

main().catch((error) => {
  console.error('[backfill-streams] failed:', error)
  process.exit(1)
})
