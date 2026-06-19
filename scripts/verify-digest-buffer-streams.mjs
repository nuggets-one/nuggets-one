/**
 * Verify tech_vc / geopolitics rows can be inserted into push_digest_buffer.
 * Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
 */
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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

async function testInsert(stream) {
  const batchKey = `${stream}:2099-01-01 00:00`
  const res = await fetch(`${supabaseUrl}/rest/v1/push_digest_buffer`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      batch_key: batchKey,
      content_stream: stream,
      article_count: 1,
      sample_title: 'verify',
      interval_hours: 1,
    }),
  })
  const body = await res.text()
  if (!res.ok) {
    throw new Error(`${stream} insert failed ${res.status}: ${body}`)
  }
  await fetch(
    `${supabaseUrl}/rest/v1/push_digest_buffer?batch_key=eq.${encodeURIComponent(batchKey)}`,
    { method: 'DELETE', headers }
  )
  return { stream, ok: true }
}

const results = await Promise.all([testInsert('tech_vc'), testInsert('geopolitics')])
console.log(JSON.stringify({ ok: true, results }, null, 2))
