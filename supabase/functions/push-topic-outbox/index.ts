type ServiceAccountJson = {
  project_id: string
  client_email: string
  private_key: string
}

const WEB_PUSH_NOTIFICATION = {
  icon: 'https://nuggets.one/icons/icon-192.png',
  badge: 'https://nuggets.one/icons/badge-72.png',
  siteUrl: 'https://www.nuggets.one',
} as const

/** Mirrors buildFeedHrefForContentStream in lib/feed/scope.ts (Edge Function cannot import app code). */
function feedHrefForContentStream(stream: string): string {
  if (stream === 'charts') return '/?stream=pulse&scope=charts'
  if (stream === 'pulse') return '/'
  if (
    stream === 'standard' ||
    stream === 'tech_vc' ||
    stream === 'geopolitics' ||
    stream === 'leadership'
  ) {
    return `/?stream=${stream}`
  }
  return '/'
}

function topicPushWebDeepLink(
  articleId: string | null,
  slug: string | null,
  stream: string
): string {
  const base = WEB_PUSH_NOTIFICATION.siteUrl.replace(/\/$/, '')
  if (articleId && slug) return `${base}/nuggets/${articleId}/${slug}`
  return `${base}${feedHrefForContentStream(stream)}`
}

function buildTopicWebpushBlock(row: TopicOutboxRow, imageUrl?: string) {
  const webTopic = topicPushWebTopic(row)
  const link = topicPushWebDeepLink(row.article_id, row.slug, row.content_stream)
  return {
    headers: {
      TTL: row.kind === 'immediate' ? '86400' : '43200',
      Urgency: row.kind === 'immediate' ? 'high' : 'normal',
      ...(webTopic ? { Topic: webTopic } : {}),
    },
    notification: {
      title: row.title,
      body: row.body,
      icon: WEB_PUSH_NOTIFICATION.icon,
      badge: WEB_PUSH_NOTIFICATION.badge,
      ...(imageUrl ? { image: imageUrl } : {}),
    },
    fcm_options: { link },
  }
}

type DigestStream = 'standard' | 'pulse' | 'charts' | 'tech_vc' | 'geopolitics' | 'leadership'

type TopicOutboxRow = {
  id: string
  topic: string
  kind: 'immediate' | 'digest'
  article_id: string | null
  title: string
  body: string
  slug: string | null
  batch_key: string | null
  content_stream: DigestStream
  data: Record<string, unknown> | null
  attempts: number
}

type DigestBufferRow = {
  batch_key: string
  content_stream: DigestStream
  article_count: number
  interval_hours: number
}

type DigestBufferArticleRow = {
  article_id: string
  title: string
  slug: string
  image_url: string | null
}

const MAX_ROWS = 25
const MAX_ATTEMPTS = 15

const PUSH_TOPIC_BY_STREAM: Record<DigestStream, string> = {
  standard: 'nuggets-stream-standard',
  pulse: 'nuggets-stream-pulse',
  charts: 'nuggets-stream-charts',
  tech_vc: 'nuggets-stream-tech-vc',
  geopolitics: 'nuggets-stream-geopolitics',
  leadership: 'nuggets-stream-leadership',
}

function topicForStream(stream: DigestStream): string {
  return PUSH_TOPIC_BY_STREAM[stream]
}

function streamPushLabel(stream: DigestStream): string {
  if (stream === 'pulse') return 'Market Pulse'
  if (stream === 'charts') return 'Charts of the Week'
  if (stream === 'tech_vc') return 'Tech x VC'
  if (stream === 'geopolitics') return 'Geopolitics'
  if (stream === 'leadership') return 'Leadership'
  return 'Deep-Dives'
}

function parseBatchKeyWindowEnd(batchKey: string, intervalHours: number): Date | null {
  const match = batchKey.match(
    /^(standard|pulse|charts|tech_vc|geopolitics|leadership):(\d{4})-(\d{2})-(\d{2}) (\d{2}):00$/
  )
  if (!match) return null
  const [, , y, mo, d, hh] = match
  const start = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), 0, 0, 0)
  return new Date(start + intervalHours * 60 * 60 * 1000)
}

function isDigestWindowClosed(batchKey: string, intervalHours: number, now: Date): boolean {
  const windowEnd = parseBatchKeyWindowEnd(batchKey, intervalHours)
  return windowEnd != null && now >= windowEnd
}

function topicPushAndroidTag(row: TopicOutboxRow): string | undefined {
  if (row.article_id) return `article:${row.article_id}`
  if (row.kind === 'digest' && row.batch_key) return `digest:${row.batch_key}`
  return undefined
}

function topicPushCollapseKey(row: TopicOutboxRow): string | undefined {
  return topicPushAndroidTag(row)
}

function topicPushWebTopic(row: TopicOutboxRow): string | undefined {
  if (row.article_id) return `article-${row.article_id}`
  if (row.batch_key) return `digest-${row.batch_key}`
  return undefined
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function base64Url(bytes: Uint8Array | string): string {
  const binary =
    typeof bytes === 'string'
      ? bytes
      : Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function parseServiceAccount(): ServiceAccountJson {
  const raw = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')?.trim()
  if (!raw) throw new Error('Missing FCM_SERVICE_ACCOUNT_JSON')

  const decoded = raw.startsWith('{') ? raw : atob(raw)
  const parsed = JSON.parse(decoded) as ServiceAccountJson
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error('Invalid FCM_SERVICE_ACCOUNT_JSON')
  }
  return parsed
}

function getSupabaseUrl(): string | null {
  return (
    Deno.env.get('SUPABASE_URL')?.replace(/\/+$/, '') ??
    Deno.env.get('EDGE_SUPABASE_URL')?.replace(/\/+$/, '') ??
    null
  )
}

function getSupabaseServiceRoleKey(): string | null {
  const explicit =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY')
  if (explicit) return explicit

  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!secretKeys) return null

  try {
    const parsed = JSON.parse(secretKeys) as Record<string, unknown>
    const candidates = [
      parsed.service_role,
      parsed.serviceRole,
      parsed.secret,
      parsed.default,
      ...Object.values(parsed),
    ]
    const key = candidates.find((value): value is string => typeof value === 'string' && value.length > 0)
    return key ?? null
  } catch {
    return null
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function getAccessToken(serviceAccount: ServiceAccountJson): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64Url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  )
  const unsignedJwt = `${header}.${claims}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedJwt)
  )

  const jwt = `${unsignedJwt}.${base64Url(new Uint8Array(signature))}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    throw new Error(`OAuth token request failed: ${res.status} ${await res.text()}`)
  }

  const body = (await res.json()) as { access_token?: string }
  if (!body.access_token) throw new Error('OAuth token response missing access_token')
  return body.access_token
}

function supabaseHeaders(serviceRoleKey: string): HeadersInit {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  }
}

async function fetchDigestBuffers(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<DigestBufferRow[]> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/push_digest_buffer?select=batch_key,content_stream,article_count,interval_hours`,
    { headers: supabaseHeaders(serviceRoleKey) }
  )

  if (!res.ok) {
    throw new Error(`push_digest_buffer fetch failed: ${res.status} ${await res.text()}`)
  }

  return (await res.json()) as DigestBufferRow[]
}

async function fetchDigestBufferArticles(
  supabaseUrl: string,
  serviceRoleKey: string,
  batchKey: string
): Promise<DigestBufferArticleRow[]> {
  const params = new URLSearchParams({
    select: 'article_id,title,slug,image_url',
    order: 'created_at.asc',
  })

  const res = await fetch(
    `${supabaseUrl}/rest/v1/push_digest_buffer_articles?${params}&batch_key=eq.${encodeURIComponent(batchKey)}`,
    { headers: supabaseHeaders(serviceRoleKey) }
  )

  if (!res.ok) {
    throw new Error(`push_digest_buffer_articles fetch failed: ${res.status} ${await res.text()}`)
  }

  return (await res.json()) as DigestBufferArticleRow[]
}

async function enqueueDigestArticleTopicPushes(
  supabaseUrl: string,
  serviceRoleKey: string,
  input: {
    batchKey: string
    stream: DigestStream
    articles: DigestBufferArticleRow[]
  }
): Promise<{ inserted: number; duplicateCount: number }> {
  let inserted = 0
  let duplicateCount = 0

  for (const article of input.articles) {
    const data: Record<string, string> = {
      stream: input.stream,
      batchKey: input.batchKey,
      articleId: article.article_id,
      slug: article.slug,
      groupKey: `nuggets-${input.stream}`,
    }
    if (article.image_url?.trim()) data.imageUrl = article.image_url.trim()

    const res = await fetch(`${supabaseUrl}/rest/v1/push_topic_outbox`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders(serviceRoleKey),
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        topic: topicForStream(input.stream),
        kind: 'digest',
        article_id: article.article_id,
        title: streamPushLabel(input.stream),
        body: article.title,
        slug: article.slug,
        batch_key: input.batchKey,
        content_stream: input.stream,
        data,
      }),
    })

    if (res.status === 409) {
      duplicateCount += 1
      continue
    }

    if (!res.ok) {
      throw new Error(`enqueueDigestArticleTopicPushes failed: ${res.status} ${await res.text()}`)
    }

    inserted += 1
  }

  return { inserted, duplicateCount }
}

async function deleteDigestBuffer(
  supabaseUrl: string,
  serviceRoleKey: string,
  batchKey: string
): Promise<void> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/push_digest_buffer?batch_key=eq.${encodeURIComponent(batchKey)}`,
    {
      method: 'DELETE',
      headers: {
        ...supabaseHeaders(serviceRoleKey),
        Prefer: 'return=minimal',
      },
    }
  )

  if (!res.ok) {
    throw new Error(`deleteDigestBuffer failed: ${res.status} ${await res.text()}`)
  }
}

/** Promote closed digest windows from push_digest_buffer into push_topic_outbox. */
async function flushCompletedDigestBuffers(
  supabaseUrl: string,
  serviceRoleKey: string,
  now = new Date()
): Promise<number> {
  const buffers = await fetchDigestBuffers(supabaseUrl, serviceRoleKey)
  let flushed = 0

  for (const buffer of buffers) {
    const batchKey = buffer.batch_key
    const stream = buffer.content_stream
    const intervalHours = Number(buffer.interval_hours ?? 1)
    const count = Number(buffer.article_count ?? 0)
    if (count <= 0) continue

    if (!isDigestWindowClosed(batchKey, intervalHours, now)) continue

    const articles = await fetchDigestBufferArticles(supabaseUrl, serviceRoleKey, batchKey)
    if (articles.length === 0) {
      await deleteDigestBuffer(supabaseUrl, serviceRoleKey, batchKey)
      continue
    }

    const { inserted, duplicateCount } = await enqueueDigestArticleTopicPushes(
      supabaseUrl,
      serviceRoleKey,
      {
        batchKey,
        stream,
        articles,
      }
    )

    const promoted = inserted + duplicateCount
    if (promoted === articles.length) {
      await deleteDigestBuffer(supabaseUrl, serviceRoleKey, batchKey)
      flushed += 1
    } else {
      console.warn(
        `[flushCompletedDigestBuffers] kept buffer ${batchKey}: promoted ${promoted}/${articles.length}`
      )
    }
  }

  return flushed
}

async function fetchRows(supabaseUrl: string, serviceRoleKey: string): Promise<TopicOutboxRow[]> {
  const params = new URLSearchParams({
    select: 'id,topic,kind,article_id,title,body,slug,batch_key,content_stream,data,attempts',
    sent_at: 'is.null',
    attempts: `lt.${MAX_ATTEMPTS}`,
    order: 'created_at.asc',
    limit: String(MAX_ROWS),
  })

  const res = await fetch(`${supabaseUrl}/rest/v1/push_topic_outbox?${params}`, {
    headers: supabaseHeaders(serviceRoleKey),
  })

  if (!res.ok) {
    throw new Error(`push_topic_outbox fetch failed: ${res.status} ${await res.text()}`)
  }

  return (await res.json()) as TopicOutboxRow[]
}

function buildMessage(row: TopicOutboxRow): Record<string, unknown> {
  const imageUrl =
    typeof row.data?.imageUrl === 'string' && row.data.imageUrl.trim()
      ? row.data.imageUrl.trim()
      : undefined
  const groupKey =
    typeof row.data?.groupKey === 'string' && row.data.groupKey.trim()
      ? row.data.groupKey.trim()
      : `nuggets-${row.content_stream}`

  const data: Record<string, string> = {
    stream: row.content_stream,
    kind: row.kind,
    groupKey,
  }

  if (row.article_id) data.articleId = row.article_id
  if (row.slug) data.slug = row.slug
  if (row.batch_key) data.batchKey = row.batch_key

  for (const [key, value] of Object.entries(row.data ?? {})) {
    if (value != null && typeof value !== 'object') data[key] = String(value)
  }

  const androidTag = topicPushAndroidTag(row)
  const collapseKey = topicPushCollapseKey(row)
  const webpush = buildTopicWebpushBlock(row, imageUrl)

  return {
    message: {
      topic: row.topic,
      notification: {
        title: row.title,
        ...(row.body ? { body: row.body } : {}),
        ...(imageUrl ? { image: imageUrl } : {}),
      },
      data,
      android: {
        priority: row.kind === 'immediate' ? 'high' : 'normal',
        ...(collapseKey ? { collapse_key: collapseKey } : {}),
        notification: {
          ...(androidTag ? { tag: androidTag } : {}),
          icon: 'ic_stat_notification',
          color: '#facc15',
          ...(imageUrl ? { image: imageUrl } : {}),
        },
      },
      apns: {
        headers: {
          'apns-priority': row.kind === 'immediate' ? '10' : '5',
          ...(collapseKey ? { 'apns-collapse-id': collapseKey } : {}),
        },
        payload: {
          aps: {
            ...(imageUrl ? { 'mutable-content': 1 } : {}),
          },
        },
        ...(imageUrl ? { fcm_options: { image: imageUrl } } : {}),
      },
      webpush,
    },
  }
}

async function recordAttempt(input: {
  supabaseUrl: string
  serviceRoleKey: string
  row: TopicOutboxRow
  status: 'sent' | 'failed'
  providerMessageId?: string | null
  errorCode?: string | null
  errorMessage?: string | null
}): Promise<void> {
  await fetch(`${input.supabaseUrl}/rest/v1/push_delivery_attempts`, {
    method: 'POST',
    headers: supabaseHeaders(input.serviceRoleKey),
    body: JSON.stringify({
      outbox_table: 'push_topic_outbox',
      outbox_id: input.row.id,
      target_type: 'topic',
      target: input.row.topic,
      status: input.status,
      provider_message_id: input.providerMessageId ?? null,
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage?.slice(0, 2000) ?? null,
    }),
  })
}

async function markSent(
  supabaseUrl: string,
  serviceRoleKey: string,
  rowId: string
): Promise<void> {
  const res = await fetch(`${supabaseUrl}/rest/v1/push_topic_outbox?id=eq.${rowId}`, {
    method: 'PATCH',
    headers: {
      ...supabaseHeaders(serviceRoleKey),
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ sent_at: new Date().toISOString(), last_error: null }),
  })

  if (!res.ok) throw new Error(`mark sent failed: ${res.status} ${await res.text()}`)
}

async function markFailed(
  supabaseUrl: string,
  serviceRoleKey: string,
  row: TopicOutboxRow,
  errorMessage: string
): Promise<void> {
  const nextAttempts = row.attempts + 1
  const patch: Record<string, unknown> = {
    attempts: nextAttempts,
    last_error: errorMessage.slice(0, 2000),
  }
  if (nextAttempts >= MAX_ATTEMPTS) patch.sent_at = new Date().toISOString()

  await fetch(`${supabaseUrl}/rest/v1/push_topic_outbox?id=eq.${row.id}`, {
    method: 'PATCH',
    headers: {
      ...supabaseHeaders(serviceRoleKey),
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  })
}

async function sendTopicMessage(
  projectId: string,
  accessToken: string,
  row: TopicOutboxRow
): Promise<string | null> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildMessage(row)),
  })

  const body = (await res.json().catch(() => ({}))) as { name?: string; error?: { message?: string } }
  if (!res.ok) {
    throw new Error(body.error?.message ?? `FCM send failed: ${res.status}`)
  }

  return body.name ?? null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const cronSecret = Deno.env.get('CRON_SECRET')?.trim()
  if (cronSecret) {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (token !== cronSecret) return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = getSupabaseUrl()
  const serviceRoleKey = getSupabaseServiceRoleKey()
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase env vars' }, 500)
  }

  let digestBuffersFlushed = 0
  try {
    digestBuffersFlushed = await flushCompletedDigestBuffers(supabaseUrl, serviceRoleKey)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[push-topic-outbox] digest flush error:', message)
  }

  let sendError: string | null = null
  let processed = 0
  let sent = 0
  let failed = 0

  try {
    const serviceAccount = parseServiceAccount()
    const accessToken = await getAccessToken(serviceAccount)
    const rows = await fetchRows(supabaseUrl, serviceRoleKey)
    processed = rows.length

    for (const row of rows) {
      try {
        const providerMessageId = await sendTopicMessage(
          serviceAccount.project_id,
          accessToken,
          row
        )
        await markSent(supabaseUrl, serviceRoleKey, row.id)
        await recordAttempt({
          supabaseUrl,
          serviceRoleKey,
          row,
          status: 'sent',
          providerMessageId,
        })
        sent += 1
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        await markFailed(supabaseUrl, serviceRoleKey, row, message)
        await recordAttempt({
          supabaseUrl,
          serviceRoleKey,
          row,
          status: 'failed',
          errorMessage: message,
        })
        failed += 1
      }
    }
  } catch (err) {
    sendError = err instanceof Error ? err.message : String(err)
    console.error('[push-topic-outbox] FCM send error:', sendError)
  }

  return jsonResponse({
    ok: sendError == null,
    digestBuffersFlushed,
    processed,
    sent,
    failed,
    ...(sendError ? { sendError } : {}),
  })
})
