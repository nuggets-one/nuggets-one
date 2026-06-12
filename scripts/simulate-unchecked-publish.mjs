/**
 * Simulate unchecked publish: write digest buffer rows (same as accumulateDigestBuffer).
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

function buildDigestBatchKey(stream, now = new Date(), intervalHours = 1) {
  const y = now.getUTCFullYear()
  const mo = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const h = now.getUTCHours()
  const windowStart = Math.floor(h / intervalHours) * intervalHours
  const hh = String(windowStart).padStart(2, '0')
  return `${stream}:${y}-${mo}-${d} ${hh}:00`
}

async function main() {
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }

  const articles = await fetch(
    `${supabaseUrl}/rest/v1/articles?select=id,title,slug,content_stream&status=eq.published&order=published_at.desc&limit=1`,
    { headers }
  ).then((r) => r.json())

  const article = articles[0]
  const stream = article.content_stream
  const batchKey = buildDigestBatchKey(stream, new Date(), 1)

  const existingBuffer = await fetch(
    `${supabaseUrl}/rest/v1/push_digest_buffer?batch_key=eq.${encodeURIComponent(batchKey)}&select=article_count`,
    { headers }
  ).then((r) => r.json())

  if (existingBuffer?.[0]) {
    await fetch(`${supabaseUrl}/rest/v1/push_digest_buffer?batch_key=eq.${encodeURIComponent(batchKey)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        article_count: Number(existingBuffer[0].article_count ?? 0) + 1,
        sample_title: article.title,
        updated_at: new Date().toISOString(),
      }),
    })
  } else {
    await fetch(`${supabaseUrl}/rest/v1/push_digest_buffer`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        batch_key: batchKey,
        content_stream: stream,
        article_count: 1,
        sample_title: article.title,
        interval_hours: 1,
      }),
    })
  }

  const articleRes = await fetch(`${supabaseUrl}/rest/v1/push_digest_buffer_articles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      batch_key: batchKey,
      article_id: article.id,
      title: article.title,
      slug: article.slug,
      image_url: null,
    }),
  })

  console.log(
    JSON.stringify(
      {
        simulatedUncheckedPublish: true,
        batchKey,
        articleId: article.id,
        articleInsertStatus: articleRes.status,
      },
      null,
      2
    )
  )
}

main().catch(console.error)
