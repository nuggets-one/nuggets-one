import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.local')
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i <= 0) continue
  const k = t.slice(0, i)
  if (process.env[k] == null) process.env[k] = t.slice(i + 1).trim()
}

const email = process.argv[2] ?? 'shahujval1@gmail.com'
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

await client.connect()

const { rows: users } = await client.query(
  `SELECT id, email FROM auth.users WHERE email = $1 LIMIT 1`,
  [email]
)
console.log('user:', users[0] ?? 'NOT FOUND')

if (users[0]) {
  const { rows: tokens } = await client.query(
    `SELECT id, platform, left(token, 20) AS token_prefix, updated_at FROM push_device_tokens WHERE user_id = $1`,
    [users[0].id]
  )
  console.log('push_device_tokens:', tokens.length ? tokens : 'NONE')

  const { rows: outbox } = await client.query(
    `SELECT id, article_id, sent_at, created_at FROM push_outbox WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
    [users[0].id]
  )
  console.log('push_outbox recent:', outbox.length ? outbox : 'NONE')
}

await client.end()
