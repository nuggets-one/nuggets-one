/** Invoke push-topic-outbox Edge Function once (flush backlog + send). */
import fs from 'node:fs'
import path from 'node:path'
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

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '')
const cronSecret = process.env.CRON_SECRET

if (!supabaseUrl || !cronSecret) {
  console.error('Missing SUPABASE_URL or CRON_SECRET')
  process.exit(1)
}

const res = await fetch(`${supabaseUrl}/functions/v1/push-topic-outbox`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cronSecret}`,
  },
  body: '{}',
})

const body = await res.json().catch(() => ({}))
console.log(JSON.stringify({ status: res.status, body }, null, 2))
process.exit(res.ok ? 0 : 1)
