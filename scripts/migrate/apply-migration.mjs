/**
 * Apply a single SQL migration file using DATABASE_URL (direct Postgres).
 * Usage (from repo root):
 *   npm --prefix scripts/migrate run apply:migration -- supabase/migrations/20240001000008_legal_pages.sql
 * Loads .env.local then .env from repo root (same pattern as scripts/validate/run-migration-chain.mjs).
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')

dotenv.config({ path: path.join(ROOT, '.env.local'), override: false })
dotenv.config({ path: path.join(ROOT, '.env') })

const rel = process.argv[2]
if (!rel) {
  console.error('Usage: node apply-migration.mjs <path-to.sql relative to repo root>')
  process.exit(1)
}

const full = path.resolve(ROOT, rel)
if (!fs.existsSync(full)) {
  console.error('File not found:', full)
  process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Missing DATABASE_URL in .env.local or .env (direct Postgres connection string).')
  process.exit(1)
}

const sql = fs.readFileSync(full, 'utf8')
const pool = new pg.Pool({ connectionString: databaseUrl })
const client = await pool.connect()

try {
  await client.query('BEGIN')
  await client.query(sql)
  await client.query('COMMIT')
  console.log('OK — applied:', path.relative(ROOT, full))
} catch (err) {
  await client.query('ROLLBACK').catch(() => {})
  console.error('FAILED — rolled back:', path.relative(ROOT, full))
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
