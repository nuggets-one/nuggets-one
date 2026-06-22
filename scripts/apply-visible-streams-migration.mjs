/**
 * Apply visible_streams migrations (034 + 035) to the linked Supabase project.
 * Requires DATABASE_URL in .env.local (direct Postgres connection).
 *
 * Usage: node scripts/apply-visible-streams-migration.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnvLocal() {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] == null) process.env[key] = value
  }
}

loadEnvLocal()

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL missing from .env.local')
  process.exit(1)
}

const MIGRATIONS = [
  {
    version: '20240001000034',
    name: 'article_visible_streams',
    file: 'supabase/migrations/20240001000034_article_visible_streams.sql',
    verify: async (client) => {
      const { rows } = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'articles'
           AND column_name = 'visible_streams'`
      )
      return rows.length > 0
    },
  },
  {
    version: '20240001000035',
    name: 'search_ranked_visible_streams',
    file: 'supabase/migrations/20240001000035_search_ranked_visible_streams.sql',
    verify: async (client) => {
      const { rows } = await client.query(
        `SELECT prosrc FROM pg_proc WHERE proname = 'search_articles_ranked' LIMIT 1`
      )
      return (rows[0]?.prosrc ?? '').includes('visible_streams')
    },
  },
]

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

async function recordMigration(version, name) {
  await client.query(
    `INSERT INTO supabase_migrations.schema_migrations (version, name)
     VALUES ($1, $2)
     ON CONFLICT (version) DO NOTHING`,
    [version, name]
  )
}

try {
  await client.connect()

  await client.query(`
    CREATE SCHEMA IF NOT EXISTS supabase_migrations;
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version text PRIMARY KEY,
      statements text[],
      name text
    );
  `)

  for (const migration of MIGRATIONS) {
    const alreadyApplied = await migration.verify(client)
    if (alreadyApplied) {
      console.log(`${migration.name} already applied — skipping ${migration.file}`)
    } else {
      const sql = fs.readFileSync(path.join(ROOT, migration.file), 'utf8')
      await client.query(sql)
      console.log(`Applied ${migration.file}`)
    }

    await recordMigration(migration.version, migration.name)
  }

  const counts = await client.query(`
    SELECT
      count(*) FILTER (WHERE status = 'published' AND visible_streams @> ARRAY['pulse']::text[]) AS pulse_visible,
      count(*) FILTER (WHERE status = 'published' AND content_stream = 'pulse') AS pulse_primary
    FROM articles
  `)
  console.log('Verify pulse counts:', counts.rows[0])
} finally {
  await client.end()
}
