import 'server-only'

import * as admin from 'firebase-admin'
import { listTokensForUsers, pruneInvalidTokens } from '@/lib/queries/push-tokens'

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

export async function sendPushForOutboxRows(rows: PushOutboxRow[]): Promise<PushSendResult> {
  const app = ensureFirebaseAdmin()
  if (!app || rows.length === 0) {
    return { sent: 0, failed: 0, prunedTokens: 0 }
  }

  const userIds = [...new Set(rows.map((row) => row.user_id))]
  const tokensByUser = await listTokensForUsers(userIds)

  const messages: admin.messaging.TokenMessage[] = []
  const tokensInOrder: string[] = []

  for (const row of rows) {
    const tokens = tokensByUser.get(row.user_id) ?? []
    for (const token of tokens) {
      tokensInOrder.push(token)
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
        },
      })
    }
  }

  if (messages.length === 0) {
    return { sent: 0, failed: 0, prunedTokens: 0 }
  }

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
      if (typeof token === 'string') invalidTokens.push(token)
    }
  })

  if (invalidTokens.length > 0) {
    await pruneInvalidTokens(invalidTokens)
  }

  return { sent, failed, prunedTokens: invalidTokens.length }
}
