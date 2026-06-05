import 'server-only'

import * as admin from 'firebase-admin'
import { listTokensForUsers, pruneInvalidTokens } from '@/lib/queries/push-tokens'
import { streamPushLabel } from '@/lib/notifications/push-digest'
import type { DigestOutboxRow, ImmediateOutboxRow } from '@/lib/notifications/push-immediate-outbox'
import { getAdminClient } from '@/lib/supabase/admin'

type ServiceAccountJson = {
  project_id: string
  client_email: string
  private_key: string
}

let initialized = false

/** Android small notification icon + tint (must match res/drawable + res/values). */
const ANDROID_PUSH_NOTIFICATION = {
  icon: 'ic_stat_notification',
  color: '#facc15',
} as const

function parseServiceAccountJson(): ServiceAccountJson | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) return null

  try {
    const decoded = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    return JSON.parse(decoded) as ServiceAccountJson
  } catch {
    return null
  }
}

function ensureFirebaseAdmin(): admin.app.App | null {
  if (initialized && admin.apps.length > 0) {
    return admin.app()
  }

  const creds = parseServiceAccountJson()
  if (!creds?.project_id || !creds.client_email || !creds.private_key) {
    return null
  }

  admin.initializeApp({
    credential: admin.credential.cert(creds as admin.ServiceAccount),
  })
  initialized = true
  return admin.app()
}

export function isPushSendConfigured(): boolean {
  return parseServiceAccountJson() != null
}

const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
])

export type PushOutboxRow = {
  id: string
  user_id: string
  article_id: string
  title: string
  slug: string
  content_stream: 'standard' | 'pulse'
}

export type PushSendResult = {
  sent: number
  failed: number
  prunedTokens: number
}

export type PushTopicOutboxRow = {
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

async function recordPushAttempt(input: {
  outboxTable: 'push_topic_outbox' | 'push_immediate_outbox' | 'push_digest_outbox' | 'push_outbox'
  outboxId: string
  targetType: 'topic' | 'token'
  target: string
  status: 'sent' | 'failed'
  providerMessageId?: string | null
  errorCode?: string | null
  errorMessage?: string | null
}): Promise<void> {
  const adminClient = getAdminClient()
  const { error } = await adminClient.from('push_delivery_attempts').insert({
    outbox_table: input.outboxTable,
    outbox_id: input.outboxId,
    target_type: input.targetType,
    target: input.target,
    status: input.status,
    provider_message_id: input.providerMessageId ?? null,
    error_code: input.errorCode ?? null,
    error_message: input.errorMessage?.slice(0, 2000) ?? null,
  })

  if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
    console.warn('[push-send] delivery attempt insert failed:', error.message)
  }
}

export async function syncTokenTopics({
  token,
  desiredTopics,
  allTopics,
}: {
  token: string
  desiredTopics: string[]
  allTopics: string[]
}): Promise<boolean> {
  const app = ensureFirebaseAdmin()
  if (!app) return false

  const messaging = admin.messaging(app)
  const desired = new Set(desiredTopics)
  const uniqueAllTopics = [...new Set(allTopics)]

  for (const topic of uniqueAllTopics) {
    try {
      if (desired.has(topic)) {
        await messaging.subscribeToTopic(token, topic)
      } else {
        await messaging.unsubscribeFromTopic(token, topic)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn('[push-send] topic sync failed:', { topic, message })
      return false
    }
  }

  return true
}

async function sendTokenMessages(
  messages: admin.messaging.TokenMessage[]
): Promise<PushSendResult> {
  const app = ensureFirebaseAdmin()
  if (!app || messages.length === 0) {
    return { sent: 0, failed: 0, prunedTokens: 0 }
  }

  const tokensInOrder = messages.map((m) => m.token).filter((t): t is string => typeof t === 'string')
  const messaging = admin.messaging(app)
  const response = await messaging.sendEach(messages)

  const invalidTokens: string[] = []
  let sent = 0
  let failed = 0

  response.responses.forEach((result, index) => {
    if (result.success) {
      sent += 1
      return
    }
    failed += 1
    const code = result.error?.code ?? ''
    if (INVALID_TOKEN_CODES.has(code)) {
      const token = tokensInOrder[index]
      if (token) invalidTokens.push(token)
    }
  })

  if (invalidTokens.length > 0) {
    await pruneInvalidTokens(invalidTokens)
  }

  return { sent, failed, prunedTokens: invalidTokens.length }
}

export async function sendPushForTopicRow(row: PushTopicOutboxRow): Promise<string | null> {
  const app = ensureFirebaseAdmin()
  if (!app) return null

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
    if (value != null && typeof value !== 'object') {
      data[key] = String(value)
    }
  }

  try {
    const providerMessageId = await admin.messaging(app).send({
      topic: row.topic,
      notification: {
        title: row.title,
        ...(row.body ? { body: row.body } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      },
      data,
      android: {
        priority: row.kind === 'immediate' ? 'high' : 'normal',
        collapseKey: row.kind === 'immediate' ? `article:${row.article_id}` : `digest:${row.batch_key}`,
        notification: {
          tag: row.kind === 'immediate' ? `article:${row.article_id}` : `digest:${row.batch_key}`,
          icon: ANDROID_PUSH_NOTIFICATION.icon,
          color: ANDROID_PUSH_NOTIFICATION.color,
          ...(imageUrl ? { imageUrl } : {}),
        },
      },
      apns: {
        headers: {
          'apns-priority': row.kind === 'immediate' ? '10' : '5',
          ...(row.kind === 'immediate' && row.article_id
            ? { 'apns-collapse-id': `article:${row.article_id}` }
            : {}),
          ...(row.kind === 'digest' && row.batch_key
            ? { 'apns-collapse-id': `digest:${row.batch_key}` }
            : {}),
        },
        payload: {
          aps: {
            sound: row.kind === 'immediate' ? 'default' : undefined,
            ...(imageUrl ? { 'mutable-content': 1 } : {}),
          },
        },
        ...(imageUrl ? { fcmOptions: { imageUrl } } : {}),
      },
      webpush: {
        headers: {
          TTL: row.kind === 'immediate' ? '86400' : '43200',
          Urgency: row.kind === 'immediate' ? 'high' : 'normal',
          Topic: row.kind === 'immediate' ? `article-${row.article_id}` : `digest-${row.batch_key}`,
        },
        ...(imageUrl ? { notification: { image: imageUrl } } : {}),
      },
    })

    await recordPushAttempt({
      outboxTable: 'push_topic_outbox',
      outboxId: row.id,
      targetType: 'topic',
      target: row.topic,
      status: 'sent',
      providerMessageId,
    })

    return providerMessageId
  } catch (err) {
    const error = err as { code?: string; message?: string }
    await recordPushAttempt({
      outboxTable: 'push_topic_outbox',
      outboxId: row.id,
      targetType: 'topic',
      target: row.topic,
      status: 'failed',
      errorCode: error.code ?? null,
      errorMessage: error.message ?? String(err),
    })
    throw err
  }
}

/** @deprecated Legacy push_outbox drain — kept for in-flight rows. */
export async function sendPushForOutboxRows(rows: PushOutboxRow[]): Promise<PushSendResult> {
  const userIds = [...new Set(rows.map((row) => row.user_id))]
  const tokensByUser = await listTokensForUsers(userIds)

  const messages: admin.messaging.TokenMessage[] = []

  for (const row of rows) {
    const tokens = tokensByUser.get(row.user_id) ?? []
    for (const token of tokens) {
      messages.push({
        token,
        notification: {
          title: row.content_stream === 'pulse' ? 'Market Pulse' : 'New Nugget',
          body: row.title,
        },
        data: {
          articleId: row.article_id,
          slug: row.slug,
        },
        android: {
          priority: 'high',
          notification: ANDROID_PUSH_NOTIFICATION,
        },
      })
    }
  }

  return sendTokenMessages(messages)
}

export async function sendPushForImmediateRows(rows: ImmediateOutboxRow[]): Promise<PushSendResult> {
  const userIds = rows.filter((r) => r.audience === 'user').map((r) => r.user_id as string)
  const tokensByUser = await listTokensForUsers(userIds)

  const messages: admin.messaging.TokenMessage[] = []

  for (const row of rows) {
    if (row.audience === 'guest' && row.token) {
      messages.push({
        token: row.token,
        notification: {
          title: row.content_stream === 'pulse' ? 'Market Pulse' : 'New Nugget',
          body: row.title,
        },
        data: { articleId: row.article_id, slug: row.slug },
        android: {
          priority: 'high',
          notification: ANDROID_PUSH_NOTIFICATION,
        },
      })
      continue
    }

    if (row.audience === 'user' && row.user_id) {
      for (const token of tokensByUser.get(row.user_id) ?? []) {
        messages.push({
          token,
          notification: {
            title: row.content_stream === 'pulse' ? 'Market Pulse' : 'New Nugget',
            body: row.title,
          },
          data: { articleId: row.article_id, slug: row.slug },
          android: {
            priority: 'high',
            notification: ANDROID_PUSH_NOTIFICATION,
          },
        })
      }
    }
  }

  return sendTokenMessages(messages)
}

export async function sendPushForDigestRows(rows: DigestOutboxRow[]): Promise<PushSendResult> {
  const userIds = rows.filter((r) => r.audience === 'user').map((r) => r.user_id as string)
  const tokensByUser = await listTokensForUsers(userIds)

  const messages: admin.messaging.TokenMessage[] = []

  for (const row of rows) {
    const title = streamPushLabel(row.content_stream)
    if (row.audience === 'guest' && row.token) {
      messages.push({
        token: row.token,
        notification: { title, body: row.body },
        data: { stream: row.content_stream },
        android: {
          priority: 'high',
          notification: ANDROID_PUSH_NOTIFICATION,
        },
      })
      continue
    }

    if (row.audience === 'user' && row.user_id) {
      for (const token of tokensByUser.get(row.user_id) ?? []) {
        messages.push({
          token,
          notification: { title, body: row.body },
          data: { stream: row.content_stream },
          android: {
            priority: 'high',
            notification: ANDROID_PUSH_NOTIFICATION,
          },
        })
      }
    }
  }

  return sendTokenMessages(messages)
}
