/**
 * One-time (or periodic) FCM topic resync for all enabled push_device_tokens.
 * Ensures existing subscribers pick up new stream topics after a content_stream expansion.
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FCM_SERVICE_ACCOUNT_JSON in .env.local
 *
 * Usage:
 *   node scripts/resync-push-topics-all.mjs [--dry-run] [--limit=N]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const ALL_PUSH_TOPICS = [
  'nuggets-stream-standard',
  'nuggets-stream-pulse',
  'nuggets-stream-charts',
  'nuggets-stream-tech-vc',
  'nuggets-stream-geopolitics',
]

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

function parseServiceAccountJson() {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) return null
  try {
    const decoded = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function topicsForPreferences(prefs) {
  if (prefs?.mute_all) return []
  const topics = []
  if (prefs?.stream_standard !== false) topics.push('nuggets-stream-standard')
  if (prefs?.stream_pulse !== false) topics.push('nuggets-stream-pulse')
  if (prefs?.stream_charts !== false) topics.push('nuggets-stream-charts')
  if (prefs?.stream_tech_vc !== false) topics.push('nuggets-stream-tech-vc')
  if (prefs?.stream_geopolitics !== false) topics.push('nuggets-stream-geopolitics')
  return topics
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
  if (!res.ok) {
    throw new Error(`${table} GET ${res.status}: ${text}`)
  }
  return body
}

async function restPatch(table, filter, payload) {
  const url = `${supabaseUrl}/rest/v1/${table}?${filter}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${table} PATCH ${res.status}: ${text}`)
  }
}

async function syncTokenTopics(messaging, token, desiredTopics) {
  const desired = new Set(desiredTopics)
  for (const topic of ALL_PUSH_TOPICS) {
    if (desired.has(topic)) {
      await messaging.subscribeToTopic(token, topic)
    } else {
      await messaging.unsubscribeFromTopic(token, topic)
    }
  }
}

loadEnvLocal()

const isDryRun = process.argv.includes('--dry-run')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number.parseInt(limitArg.split('=')[1], 10) : null

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

const creds = parseServiceAccountJson()
if (!creds && !isDryRun) {
  console.error('Missing FCM_SERVICE_ACCOUNT_JSON — use --dry-run to list tokens only')
  process.exit(1)
}

let messaging = null
if (creds && !isDryRun) {
  admin.initializeApp({ credential: admin.credential.cert(creds) })
  messaging = admin.messaging()
}

const prefsByUser = new Map()

async function getPrefsForUser(userId) {
  if (!userId) return null
  if (prefsByUser.has(userId)) return prefsByUser.get(userId)
  const rows = await restGet(
    'notification_preferences',
    `user_id=eq.${encodeURIComponent(userId)}&select=mute_all,stream_standard,stream_pulse,stream_charts,stream_tech_vc,stream_geopolitics`
  )
  const prefs = rows?.[0] ?? null
  prefsByUser.set(userId, prefs)
  return prefs
}

async function main() {
  const pageSize = 200
  let offset = 0
  let total = 0
  let synced = 0
  let failed = 0
  let skipped = 0

  while (true) {
    const end = offset + pageSize - 1
    const rows = await restGet(
      'push_device_tokens',
      `notifications_enabled=eq.true&select=token,user_id,platform&order=updated_at.desc&offset=${offset}&limit=${pageSize}`
    )

    if (!Array.isArray(rows) || rows.length === 0) break

    for (const row of rows) {
      if (limit != null && total >= limit) break
      total += 1

      const token = row.token
      const userId = row.user_id ?? null
      let desiredTopics = []

      if (userId) {
        const prefs = await getPrefsForUser(userId)
        desiredTopics = topicsForPreferences(prefs)
      } else {
        desiredTopics = [...ALL_PUSH_TOPICS]
      }

      if (isDryRun) {
        console.log(
          JSON.stringify({
            dry_run: true,
            platform: row.platform,
            user_id: userId,
            topics: desiredTopics,
            token_prefix: token?.slice(0, 12),
          })
        )
        synced += 1
        continue
      }

      try {
        await syncTokenTopics(messaging, token, desiredTopics)
        await restPatch(
          'push_device_tokens',
          `token=eq.${encodeURIComponent(token)}`,
          {
            last_topic_sync_at: new Date().toISOString(),
            failure_count: 0,
            updated_at: new Date().toISOString(),
          }
        )
        synced += 1
      } catch (err) {
        failed += 1
        console.warn('[resync-push-topics] failed:', {
          token_prefix: token?.slice(0, 12),
          message: err instanceof Error ? err.message : String(err),
        })
        try {
          await restPatch(
            'push_device_tokens',
            `token=eq.${encodeURIComponent(token)}`,
            { failure_count: 1, updated_at: new Date().toISOString() }
          )
        } catch {
          // ignore patch failure
        }
      }
    }

    if (limit != null && total >= limit) break
    if (rows.length < pageSize) break
    offset += pageSize
  }

  console.log(
    JSON.stringify(
      {
        dry_run: isDryRun,
        processed: total,
        synced,
        failed,
        skipped,
      },
      null,
      2
    )
  )

  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
