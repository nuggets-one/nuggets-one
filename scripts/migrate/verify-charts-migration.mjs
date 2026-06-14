import * as path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
dotenv.config({ path: path.join(ROOT, '.env.local') })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()

try {
  const cols = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='notification_preferences' AND column_name='stream_charts'`
  )
  const idx = await client.query(
    `SELECT indexname FROM pg_indexes WHERE indexname='idx_articles_feed_charts'`
  )
  const tags = await client.query(
    `SELECT slug, label, dimension, is_official FROM tags
     WHERE slug IN ('chart','goldman-sachs','bloomberg','jpmorgan') ORDER BY slug`
  )
  const check = await client.query(
    `SELECT pg_get_constraintdef(c.oid) AS def
     FROM pg_constraint c
     JOIN pg_class t ON c.conrelid = t.oid
     WHERE t.relname = 'articles' AND c.conname = 'articles_content_stream_check'`
  )
  const rpc = await client.query(
    `SELECT prosrc FROM pg_proc WHERE proname = 'get_notification_recipients' LIMIT 1`
  )
  const chartsCount = await client.query(
    `SELECT count(*)::int AS n FROM articles WHERE content_stream = 'charts' AND status = 'published'`
  )

  console.log(
    JSON.stringify(
      {
        stream_charts_column: cols.rowCount > 0,
        feed_charts_index: idx.rowCount > 0,
        tags: tags.rows,
        articles_check: check.rows[0]?.def ?? null,
        rpc_has_stream_charts: (rpc.rows[0]?.prosrc ?? '').includes('stream_charts'),
        published_charts_articles: chartsCount.rows[0]?.n ?? 0,
      },
      null,
      2
    )
  )
} finally {
  client.release()
  await pool.end()
}
