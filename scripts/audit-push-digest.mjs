/**
 * Audit push digest pipeline state (migration, buffers, outbox, cron hints).
 * Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
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
}

async function restGet(table, params = '') {
  const url = `${supabaseUrl}/rest/v1/${table}?${params}`
  const res = await fetch(url, { headers })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { ok: res.ok, status: res.status, body }
}

async function main() {
  const report = { ok: true, checks: {} }

  // 1. push_digest_buffer_articles table
  const articlesTable = await restGet('push_digest_buffer_articles', 'select=article_id&limit=1')
  report.checks.push_digest_buffer_articles = {
    exists: articlesTable.ok || articlesTable.status !== 404,
    status: articlesTable.status,
    hint:
      articlesTable.status === 404 || String(articlesTable.body?.code) === 'PGRST205'
        ? 'MISSING — run npm run db:apply-push-migration'
        : 'present',
  }
  if (!articlesTable.ok && articlesTable.status !== 406) {
    report.ok = false
  }

  // 2. Recent digest buffers
  const buffers = await restGet(
    'push_digest_buffer',
    'select=batch_key,content_stream,article_count,interval_hours,updated_at&order=updated_at.desc&limit=5'
  )
  report.checks.push_digest_buffer = {
    status: buffers.status,
    rows: buffers.ok ? buffers.body : buffers.body,
  }

  // 3. Recent buffer articles
  const bufferArticles = await restGet(
    'push_digest_buffer_articles',
    'select=batch_key,article_id,title,created_at&order=created_at.desc&limit=5'
  )
  report.checks.push_digest_buffer_articles_rows = {
    status: bufferArticles.status,
    rows: bufferArticles.ok ? bufferArticles.body : bufferArticles.body,
  }

  // 4. Recent digest outbox rows
  const digestOutbox = await restGet(
    'push_topic_outbox',
    'select=id,kind,article_id,batch_key,sent_at,last_error,created_at&kind=eq.digest&order=created_at.desc&limit=10'
  )
  report.checks.push_topic_outbox_digest = {
    status: digestOutbox.status,
    rows: digestOutbox.ok ? digestOutbox.body : digestOutbox.body,
  }

  // 5. Recent immediate outbox (for comparison)
  const immediateOutbox = await restGet(
    'push_topic_outbox',
    'select=id,kind,article_id,sent_at,last_error,created_at&kind=eq.immediate&order=created_at.desc&limit=5'
  )
  report.checks.push_topic_outbox_immediate = {
    status: immediateOutbox.status,
    rows: immediateOutbox.ok ? immediateOutbox.body : immediateOutbox.body,
  }

  // 6. Unsent counts
  const [unsentDigest, unsentImmediate] = await Promise.all([
    restGet(
      'push_topic_outbox',
      'select=id&kind=eq.digest&sent_at=is.null&limit=1'
    ),
    restGet(
      'push_topic_outbox',
      'select=id&kind=eq.immediate&sent_at=is.null&limit=1'
    ),
  ])
  report.checks.unsent_counts = {
    digest: unsentDigest.ok && Array.isArray(unsentDigest.body) ? unsentDigest.body.length : null,
    immediate:
      unsentImmediate.ok && Array.isArray(unsentImmediate.body) ? unsentImmediate.body.length : null,
  }

  // 7. Delivery attempts
  const attempts = await restGet(
    'push_delivery_attempts',
    'select=status,error_message,created_at,outbox_table&outbox_table=eq.push_topic_outbox&order=created_at.desc&limit=10'
  )
  report.checks.push_delivery_attempts = {
    status: attempts.status,
    rows: attempts.ok ? attempts.body : attempts.body,
  }

  report.summary = {
    migration24LikelyApplied: articlesTable.ok,
    stuckDigestBuffers: buffers.ok && Array.isArray(buffers.body) ? buffers.body.length : null,
    recentDigestOutboxCount: digestOutbox.ok && Array.isArray(digestOutbox.body) ? digestOutbox.body.length : 0,
    recentImmediateOutboxCount:
      immediateOutbox.ok && Array.isArray(immediateOutbox.body) ? immediateOutbox.body.length : 0,
  }

  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
