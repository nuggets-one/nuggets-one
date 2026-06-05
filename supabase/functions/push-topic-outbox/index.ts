type ServiceAccountJson = {
  project_id: string
  client_email: string
  private_key: string
}

type TopicOutboxRow = {
  id: string
  topic: string
  kind: 'immediate' | 'digest'
  article_id: string | null
  title: string
  body: string
  slug: string | null
  batch_key: string | null
  content_stream: 'standard' | 'pulse'
  data: Record<string, unknown> | null
  attempts: number
}

const MAX_ROWS = 25
const MAX_ATTEMPTS = 15

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
  const data: Record<string, string> = {
    stream: row.content_stream,
    kind: row.kind,
  }

  if (row.article_id) data.articleId = row.article_id
  if (row.slug) data.slug = row.slug
  if (row.batch_key) data.batchKey = row.batch_key

  for (const [key, value] of Object.entries(row.data ?? {})) {
    if (value != null && typeof value !== 'object') data[key] = String(value)
  }

  return {
    message: {
      topic: row.topic,
      notification: { title: row.title, body: row.body },
      data,
      android: {
        priority: row.kind === 'immediate' ? 'high' : 'normal',
        collapse_key:
          row.kind === 'immediate' ? `article:${row.article_id}` : `digest:${row.batch_key}`,
      },
      apns: {
        headers: {
          'apns-priority': row.kind === 'immediate' ? '10' : '5',
          'apns-collapse-id':
            row.kind === 'immediate' ? `article:${row.article_id}` : `digest:${row.batch_key}`,
        },
      },
      webpush: {
        headers: {
          TTL: row.kind === 'immediate' ? '86400' : '43200',
          Urgency: row.kind === 'immediate' ? 'high' : 'normal',
          Topic: row.kind === 'immediate' ? `article-${row.article_id}` : `digest-${row.batch_key}`,
        },
      },
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

  try {
    const serviceAccount = parseServiceAccount()
    const accessToken = await getAccessToken(serviceAccount)
    const rows = await fetchRows(supabaseUrl, serviceRoleKey)

    let sent = 0
    let failed = 0

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

    return jsonResponse({ ok: true, processed: rows.length, sent, failed })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: message }, 500)
  }
})
