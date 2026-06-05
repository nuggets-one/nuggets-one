import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const JOB_NAME = 'push-topic-outbox-every-5-min'

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

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

loadEnvLocal()

const databaseUrl = process.env.DATABASE_URL
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '')
const cronSecret = process.env.CRON_SECRET

if (!databaseUrl || !supabaseUrl || !cronSecret) {
  console.error('Missing DATABASE_URL, SUPABASE_URL, or CRON_SECRET')
  process.exit(1)
}

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()

  await client.query('CREATE EXTENSION IF NOT EXISTS pg_cron')
  await client.query('CREATE EXTENSION IF NOT EXISTS pg_net')

  await client.query(
    `SELECT cron.unschedule($1)
     WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = $1)`,
    [JOB_NAME]
  )

  const functionUrl = `${supabaseUrl}/functions/v1/push-topic-outbox`
  const command = `
    SELECT net.http_post(
      url := ${sqlLiteral(functionUrl)},
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', ${sqlLiteral(`Bearer ${cronSecret}`)}
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  `

  await client.query('SELECT cron.schedule($1, $2, $3)', [JOB_NAME, '*/5 * * * *', command])

  const verify = await client.query(
    `SELECT jobid, jobname, schedule, active
     FROM cron.job
     WHERE jobname = $1`,
    [JOB_NAME]
  )

  console.log('Scheduled push topic cron:', verify.rows[0])
} finally {
  await client.end()
}
