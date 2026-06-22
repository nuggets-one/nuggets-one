// scripts/migrate/verify-visible-streams.ts
// Verify visible_streams column, backfill health, and per-stream counts.
// Run: npm exec tsx scripts/migrate/verify-visible-streams.ts

import pg from 'pg'
import { config } from './config'
import type { ContentStream } from '../../types/article'

const STREAMS: ContentStream[] = [
  'standard',
  'pulse',
  'charts',
  'tech_vc',
  'geopolitics',
  'leadership',
]

async function main() {
  const databaseUrl = config.databaseUrl
  if (!databaseUrl) {
    throw new Error('DATABASE_URL missing — set in .env.local for verify-visible-streams')
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()

  try {
    const { rows: columnRows } = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'articles'
         AND column_name = 'visible_streams'`
    )
    const columnExists = columnRows.length > 0
    console.log(`[verify-visible-streams] column exists: ${columnExists}`)

    if (!columnExists) {
      console.error('[verify-visible-streams] FAIL: articles.visible_streams column missing')
      process.exit(1)
    }

    const { rows: emptyRows } = await client.query(
      `SELECT count(*)::int AS n FROM articles WHERE visible_streams = '{}'`
    )
    const emptyVisibleStreams = emptyRows[0]?.n ?? 0
    console.log(`[verify-visible-streams] articles with empty visible_streams: ${emptyVisibleStreams}`)

    console.log('[verify-visible-streams] published counts by stream:')
    let mismatch = false

    for (const stream of STREAMS) {
      const { rows } = await client.query(
        `SELECT
           count(*) FILTER (WHERE status = 'published' AND visible_streams @> ARRAY[$1]::text[])::int AS visible,
           count(*) FILTER (WHERE status = 'published' AND content_stream = $1)::int AS primary_stream
         FROM articles`,
        [stream]
      )
      const visible = rows[0]?.visible ?? 0
      const primary = rows[0]?.primary_stream ?? 0
      console.log(`  ${stream}: visible_streams=${visible}, content_stream=${primary}`)
      if (primary > 0 && visible === 0) {
        mismatch = true
      }
    }

    if (emptyVisibleStreams > 0 || mismatch) {
      console.error(
        '[verify-visible-streams] FAIL: backfill incomplete — run npm exec tsx scripts/migrate/backfill-visible-streams.ts'
      )
      process.exit(1)
    }

    console.log('[verify-visible-streams] OK')
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error('[verify-visible-streams] failed:', error)
  process.exit(1)
})
