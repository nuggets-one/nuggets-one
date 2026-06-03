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

const migrationPath = path.join(
  ROOT,
  'supabase/migrations/20240001000020_push_device_tokens.sql'
)
const sql = fs.readFileSync(migrationPath, 'utf8')

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()

  const { rows: existing } = await client.query(
    `SELECT to_regclass('public.push_device_tokens') AS reg`
  )
  if (existing[0]?.reg) {
    console.log('push_device_tokens already exists — skipping migration SQL')
  } else {
    await client.query(sql)
    console.log('Applied 20240001000020_push_device_tokens.sql')
  }

  await client.query(`
    CREATE SCHEMA IF NOT EXISTS supabase_migrations;
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version text PRIMARY KEY,
      statements text[],
      name text
    );
  `)

  const version = '20240001000020'
  const { rowCount } = await client.query(
    `INSERT INTO supabase_migrations.schema_migrations (version, name)
     VALUES ($1, $2)
     ON CONFLICT (version) DO NOTHING`,
    [version, 'push_device_tokens']
  )

  if (rowCount && rowCount > 0) {
    console.log('Recorded migration version in schema_migrations')
  }

  const verify = await client.query(`
    SELECT
      to_regclass('public.push_device_tokens') AS tokens,
      to_regclass('public.push_outbox') AS outbox
  `)
  console.log('Verify:', verify.rows[0])
} finally {
  await client.end()
}
