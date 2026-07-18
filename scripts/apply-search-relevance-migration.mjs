/**
 * Apply search-relevance migrations (037 -> 041) to the linked Supabase project.
 * Requires DATABASE_URL in .env.local (direct Postgres connection).
 *
 * These make search recall-friendly (prefix FTS + trigram fallback-only) and
 * were previously authored but never deployed. Idempotent: each step verifies
 * whether it is already applied before running.
 *
 * Usage: node scripts/apply-search-relevance-migration.mjs
 *   Optional: SEARCH_SMOKE_Q="minimum viable product" to assert a real query returns rows.
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
  console.error('DATABASE_URL missing from .env.local (direct Postgres connection required).')
  process.exit(1)
}

const MIGRATIONS = [
  {
    version: '20240001000037',
    name: 'search_vector_weighted_tags',
    file: 'supabase/migrations/20240001000037_search_vector_weighted_tags.sql',
    verify: async (client) => {
      const { rows } = await client.query(
        `SELECT pg_get_expr(d.adbin, d.adrelid) AS expr
         FROM pg_attrdef d
         JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
         WHERE a.attrelid = 'public.articles'::regclass AND a.attname = 'search_vector'`
      )
      return (rows[0]?.expr ?? '').includes('tag_slugs_to_text')
    },
  },
  {
    version: '20240001000038',
    name: 'pg_trgm_title_index',
    file: 'supabase/migrations/20240001000038_pg_trgm_title_index.sql',
    verify: async (client) => {
      const ext = await client.query(`SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'`)
      const idx = await client.query(
        `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_articles_title_trgm'`
      )
      return ext.rows.length > 0 && idx.rows.length > 0
    },
  },
  {
    version: '20240001000039',
    name: 'search_articles_trigram',
    file: 'supabase/migrations/20240001000039_search_articles_trigram.sql',
    verify: async (client) => {
      const { rows } = await client.query(
        `SELECT 1 FROM pg_proc WHERE proname = 'search_articles_trigram' LIMIT 1`
      )
      return rows.length > 0
    },
  },
  {
    version: '20240001000040',
    name: 'search_relevance_prefix_fuzzy',
    file: 'supabase/migrations/20240001000040_search_relevance_prefix_fuzzy.sql',
    verify: async (client) => {
      const helper = await client.query(
        `SELECT 1 FROM pg_proc WHERE proname = 'search_prefix_tsquery' LIMIT 1`
      )
      const ranked = await client.query(
        `SELECT prosrc FROM pg_proc WHERE proname = 'search_articles_ranked' LIMIT 1`
      )
      return helper.rows.length > 0 && (ranked.rows[0]?.prosrc ?? '').includes('search_prefix_tsquery')
    },
  },
  {
    version: '20240001000041',
    name: 'search_fts_first_trigram_fallback',
    file: 'supabase/migrations/20240001000041_search_fts_first_trigram_fallback.sql',
    verify: async (client) => {
      const suggestTrigram = await client.query(
        `SELECT 1 FROM pg_proc WHERE proname = 'search_suggestions_trigram' LIMIT 1`
      )
      const ranked = await client.query(
        `SELECT prosrc FROM pg_proc WHERE proname = 'search_suggestions_ranked' LIMIT 1`
      )
      const src = ranked.rows[0]?.prosrc ?? ''
      // FTS-only hot path: prefix match present, blended title % removed.
      return (
        suggestTrigram.rows.length > 0 &&
        src.includes('search_prefix_tsquery') &&
        !src.includes('title %')
      )
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

async function smokeTest() {
  const q = process.env.SEARCH_SMOKE_Q ?? 'the'
  const suggest = await client.query(
    `SELECT count(*)::int AS n FROM public.search_suggestions_ranked('all', $1, 8, NULL)`,
    [q]
  )
  const ranked = await client.query(
    `SELECT count(*)::int AS n FROM public.search_articles_ranked('all', ARRAY[]::text[], $1, 24, NULL, NULL, NULL, NULL)`,
    [q]
  )
  console.log(
    `Smoke (q="${q}"): suggestions=${suggest.rows[0].n} rows, ranked=${ranked.rows[0].n} rows`
  )
  if (process.env.SEARCH_SMOKE_Q && (suggest.rows[0].n === 0 || ranked.rows[0].n === 0)) {
    console.warn(
      `WARNING: SEARCH_SMOKE_Q returned zero rows in one of the paths — inspect corpus/threshold.`
    )
  }
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

  await smokeTest()
  console.log('Search relevance migrations complete.')
} finally {
  await client.end()
}
