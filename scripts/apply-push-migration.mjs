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
    version: '20240001000020',
    name: 'push_device_tokens',
    file: 'supabase/migrations/20240001000020_push_device_tokens.sql',
    verifyTable: 'push_device_tokens',
  },
  {
    version: '20240001000021',
    name: 'push_guest_tokens',
    file: 'supabase/migrations/20240001000021_push_guest_tokens.sql',
    verifyTable: 'push_digest_buffer',
  },
]

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

async function tableExists(tableName) {
  const { rows } = await client.query(`SELECT to_regclass($1) AS reg`, [`public.${tableName}`])
  return Boolean(rows[0]?.reg)
}

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
    const exists = await tableExists(migration.verifyTable)
    if (exists) {
      console.log(`${migration.verifyTable} already exists — skipping ${migration.file}`)
    } else {
      const sql = fs.readFileSync(path.join(ROOT, migration.file), 'utf8')
      await client.query(sql)
      console.log(`Applied ${migration.file}`)
    }

    await recordMigration(migration.version, migration.name)
  }

  const verify = await client.query(`
    SELECT
      to_regclass('public.push_device_tokens') AS tokens,
      to_regclass('public.push_outbox') AS outbox,
      to_regclass('public.push_digest_buffer') AS digest_buffer,
      to_regclass('public.push_digest_outbox') AS digest_outbox,
      to_regclass('public.push_immediate_outbox') AS immediate_outbox
  `)
  console.log('Verify:', verify.rows[0])
} finally {
  await client.end()
}
