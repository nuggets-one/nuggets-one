/**
 * End-to-end digest flush test: seed a CLOSED digest window, invoke edge function, verify send.
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
const cronSecret = process.env.CRON_SECRET

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

async function restGet(table, params = '') {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${params}`, { headers })
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) }
}

async function restPost(table, row) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(row),
  })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { ok: res.ok, status: res.status, body }
}

async function restDelete(table, filter) {
  await fetch(`${supabaseUrl}/rest/v1/${table}?${filter}`, { method: 'DELETE', headers })
}

function closedBatchKey(stream, intervalHours = 1) {
  const now = new Date()
  const prev = new Date(now.getTime() - intervalHours * 60 * 60 * 1000 - 5 * 60 * 1000)
  const y = prev.getUTCFullYear()
  const mo = String(prev.getUTCMonth() + 1).padStart(2, '0')
  const d = String(prev.getUTCDate()).padStart(2, '0')
  const h = prev.getUTCHours()
  const windowStart = Math.floor(h / intervalHours) * intervalHours
  const hh = String(windowStart).padStart(2, '0')
  return `${stream}:${y}-${mo}-${d} ${hh}:00`
}

async function main() {
  const articles = await restGet(
    'articles',
    'select=id,title,slug,content_stream&status=eq.published&order=published_at.desc&limit=1'
  )
  const article = articles.body?.[0]
  if (!article) {
    console.error('No published article')
    process.exit(1)
  }

  const stream = article.content_stream
  const batchKey = closedBatchKey(stream, 1)
  console.log('Using closed batch key:', batchKey)

  // Clean prior test data for this batch
  await restDelete('push_digest_buffer', `batch_key=eq.${encodeURIComponent(batchKey)}`)

  const bufferInsert = await restPost('push_digest_buffer', {
    batch_key: batchKey,
    content_stream: stream,
    article_count: 1,
    sample_title: article.title,
    interval_hours: 1,
  })
  console.log('Buffer seed:', bufferInsert.status)

  const articleInsert = await restPost('push_digest_buffer_articles', {
    batch_key: batchKey,
    article_id: article.id,
    title: `[digest-e2e-test] ${article.title}`.slice(0, 200),
    slug: article.slug,
    image_url: null,
  })
  console.log('Article seed:', articleInsert.status)

  const edgeHeaders = { 'Content-Type': 'application/json' }
  if (cronSecret) edgeHeaders.Authorization = `Bearer ${cronSecret}`

  const edgeRes = await fetch(`${supabaseUrl}/functions/v1/push-topic-outbox`, {
    method: 'POST',
    headers: edgeHeaders,
    body: '{}',
  })
  const edgeBody = await edgeRes.json().catch(() => ({}))
  console.log('Edge function response:', edgeRes.status, edgeBody)

  const digestRows = await restGet(
    'push_topic_outbox',
    `select=id,kind,sent_at,last_error,created_at&kind=eq.digest&batch_key=eq.${encodeURIComponent(batchKey)}&order=created_at.desc`
  )
  console.log('Digest outbox after flush:', digestRows.body)

  const buffersLeft = await restGet('push_digest_buffer', `batch_key=eq.${encodeURIComponent(batchKey)}`)
  console.log('Buffer remaining (expect empty):', buffersLeft.body)

  const success =
    edgeRes.ok &&
    (edgeBody.digestBuffersFlushed ?? 0) >= 1 &&
    Array.isArray(digestRows.body) &&
    digestRows.body.some((r) => r.sent_at)

  console.log(success ? 'E2E PASS: digest flushed and sent' : 'E2E INCOMPLETE: check edge auth / cron')
  process.exit(success ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
