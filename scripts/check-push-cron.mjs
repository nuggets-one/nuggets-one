import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { fileURLToPath } from 'node:url'

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

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  const cron = await client.query(
    `SELECT jobid, jobname, schedule, active FROM cron.job
     WHERE jobname LIKE '%push%' OR jobname LIKE '%topic%'
     ORDER BY jobname`
  )
  console.log(JSON.stringify({ pg_cron_jobs: cron.rows }, null, 2))
} finally {
  await client.end()
}
