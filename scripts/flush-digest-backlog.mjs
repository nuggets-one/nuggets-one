/** Flush closed digest buffers into push_topic_outbox via service role (no FCM). */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function parseBatchKeyWindowEnd(batchKey, intervalHours) {
  const match = batchKey.match(/^(standard|pulse):(\d{4})-(\d{2})-(\d{2}) (\d{2}):00$/)
  if (!match) return null
  const [, , y, mo, d, hh] = match
  const start = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), 0, 0, 0)
  return new Date(start + intervalHours * 60 * 60 * 1000)
}

function isDigestWindowClosed(batchKey, intervalHours, now) {
  const windowEnd = parseBatchKeyWindowEnd(batchKey, intervalHours)
  return windowEnd != null && now >= windowEnd
}

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

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
}

async function restGet(table, params = '') {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${params}`, { headers })
  return res.json()
}

async function flushCompletedDigestBuffers(now = new Date()) {
  const buffers = await restGet('push_digest_buffer', 'select=*')
  let flushed = 0

  for (const buffer of buffers ?? []) {
    const batchKey = buffer.batch_key
    const stream = buffer.content_stream
    const intervalHours = Number(buffer.interval_hours ?? 1)
    if (Number(buffer.article_count ?? 0) <= 0) continue
    if (!isDigestWindowClosed(batchKey, intervalHours, now)) continue

    const articles = await restGet(
      'push_digest_buffer_articles',
      `select=article_id,title,slug,image_url&batch_key=eq.${encodeURIComponent(batchKey)}&order=created_at.asc`
    )

    if (!articles?.length) {
      await fetch(`${supabaseUrl}/rest/v1/push_digest_buffer?batch_key=eq.${encodeURIComponent(batchKey)}`, {
        method: 'DELETE',
        headers,
      })
      continue
    }

    let inserted = 0
    let duplicateCount = 0
    const topic = stream === 'pulse' ? 'nuggets-stream-pulse' : 'nuggets-stream-standard'
    const label = stream === 'pulse' ? 'Market Pulse' : 'Nuggets'

    for (const article of articles) {
      const res = await fetch(`${supabaseUrl}/rest/v1/push_topic_outbox`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic,
          kind: 'digest',
          article_id: article.article_id,
          title: label,
          body: article.title,
          slug: article.slug,
          batch_key: batchKey,
          content_stream: stream,
          data: {
            stream,
            batchKey,
            articleId: article.article_id,
            slug: article.slug,
            groupKey: `nuggets-${stream}`,
            ...(article.image_url ? { imageUrl: article.image_url } : {}),
          },
        }),
      })
      if (res.status === 409) duplicateCount += 1
      else if (res.ok) inserted += 1
      else {
        console.error('insert failed', batchKey, article.article_id, await res.text())
      }
    }

    if (inserted + duplicateCount === articles.length) {
      await fetch(`${supabaseUrl}/rest/v1/push_digest_buffer?batch_key=eq.${encodeURIComponent(batchKey)}`, {
        method: 'DELETE',
        headers,
      })
      flushed += 1
      console.log(`Flushed ${batchKey}: ${inserted} inserted, ${duplicateCount} duplicates`)
    }
  }

  return flushed
}

const flushed = await flushCompletedDigestBuffers()
console.log(JSON.stringify({ flushed }, null, 2))
