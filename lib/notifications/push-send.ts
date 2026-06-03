import 'server-only'

import * as admin from 'firebase-admin'
import { listTokensForUsers, pruneInvalidTokens } from '@/lib/queries/push-tokens'
import { streamPushLabel } from '@/lib/notifications/push-digest'
import type { DigestOutboxRow, ImmediateOutboxRow } from '@/lib/notifications/push-immediate-outbox'

type ServiceAccountJson = {
  project_id: string
  client_email: string
  private_key: string
}

let initialized = false

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
        android: { priority: 'high' },
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
        android: { priority: 'high' },
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
          android: { priority: 'high' },
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
        android: { priority: 'high' },
      })
      continue
    }

    if (row.audience === 'user' && row.user_id) {
      for (const token of tokensByUser.get(row.user_id) ?? []) {
        messages.push({
          token,
          notification: { title, body: row.body },
          data: { stream: row.content_stream },
          android: { priority: 'high' },
        })
      }
    }
  }

  return sendTokenMessages(messages)
}
