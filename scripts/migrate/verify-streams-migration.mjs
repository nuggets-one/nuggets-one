/**
 * Verify Tech x VC / Geopolitics stream migration + push_digest_buffer constraint.
 * Requires DATABASE_URL in .env.local (direct Postgres connection).
 *
 * Usage: node scripts/migrate/verify-streams-migration.mjs
 */
import * as path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
dotenv.config({ path: path.join(ROOT, '.env.local') })

const EXPECTED_STREAMS = ['standard', 'pulse', 'charts', 'tech_vc', 'geopolitics']

function streamsInCheck(def) {
  if (!def) return []

  const inMatch = def.match(/IN \(([^)]+)\)/i)
  if (inMatch) {
    return inMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .filter(Boolean)
  }

  const anyMatch = def.match(/ANY \(ARRAY\[([^\]]+)\]/i)
  if (anyMatch) {
    return anyMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^'|'::text$/g, '').replace(/^'|'$/g, ''))
      .filter(Boolean)
  }

  return []
}

function checkIncludesAllStreams(def) {
  const found = streamsInCheck(def)
  return EXPECTED_STREAMS.every((s) => found.includes(s))
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()

try {
  const prefCols = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'notification_preferences'
       AND column_name IN ('stream_tech_vc', 'stream_geopolitics')
     ORDER BY column_name`
  )

  const constraintTables = [
    { table: 'articles', pattern: 'content_stream' },
    { table: 'user_notifications', pattern: 'content_stream' },
    { table: 'pending_fanout', pattern: 'stream' },
    { table: 'push_outbox', pattern: 'content_stream' },
    { table: 'push_topic_outbox', pattern: 'content_stream' },
    { table: 'push_digest_buffer', pattern: 'content_stream' },
  ]

  const constraints = {}
  for (const { table, pattern } of constraintTables) {
    const { rows } = await client.query(
      `SELECT c.conname, pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON c.conrelid = t.oid
       JOIN pg_namespace n ON t.relnamespace = n.oid
       WHERE n.nspname = 'public'
         AND t.relname = $1
         AND c.contype = 'c'
         AND pg_get_constraintdef(c.oid) ILIKE $2
       ORDER BY c.conname`,
      [table, `%${pattern}%`]
    )
    const row =
      rows.find((r) => r.conname.includes('content_stream')) ??
      rows.find((r) => r.conname.includes('stream_check')) ??
      rows[0]
    constraints[table] = {
      constraint: row?.conname ?? null,
      def: row?.def ?? null,
      all_streams: checkIncludesAllStreams(row?.def),
    }
  }

  const rpc = await client.query(
    `SELECT prosrc FROM pg_proc WHERE proname = 'get_notification_recipients' LIMIT 1`
  )
  const rpcSrc = rpc.rows[0]?.prosrc ?? ''

  const indexes = await client.query(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname = 'public'
       AND indexname IN (
         'idx_articles_feed_tech_vc',
         'idx_articles_feed_geopolitics',
         'idx_notification_prefs_active_tech_vc',
         'idx_notification_prefs_active_geopolitics'
       )
     ORDER BY indexname`
  )

  const report = {
    notification_pref_columns: prefCols.rows.map((r) => r.column_name),
    pref_columns_ok: prefCols.rowCount === 2,
    constraints,
    constraints_ok: Object.values(constraints).every((c) => c.all_streams),
    rpc_has_tech_vc: rpcSrc.includes('stream_tech_vc'),
    rpc_has_geopolitics: rpcSrc.includes('stream_geopolitics'),
    feed_indexes: indexes.rows.map((r) => r.indexname),
    feed_indexes_ok: indexes.rowCount === 4,
  }

  report.ok =
    report.pref_columns_ok &&
    report.constraints_ok &&
    report.rpc_has_tech_vc &&
    report.rpc_has_geopolitics &&
    report.feed_indexes_ok

  console.log(JSON.stringify(report, null, 2))
  if (!report.ok) process.exit(1)
} finally {
  client.release()
  await pool.end()
}
