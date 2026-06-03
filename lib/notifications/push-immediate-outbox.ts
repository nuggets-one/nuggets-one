import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import { getRecipients } from '@/lib/notifications/fan-out'
import { insertOutboxRowsIgnoreDuplicates } from '@/lib/notifications/outbox-insert'

const CHUNK = 500

async function listGuestTokens(): Promise<string[]> {
  const adminClient = getAdminClient()
  const { data, error } = await adminClient
    .from('push_device_tokens')
    .select('token')
    .is('user_id', null)
    .eq('notifications_enabled', true)

  if (error) throw new Error(`listGuestTokens: ${error.message}`)
  return (data ?? []).map((row) => row.token as string)
}

async function listUserIdsWithTokens(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return []
  const adminClient = getAdminClient()
  const unique = [...new Set(userIds)]
  const withTokens: string[] = []

  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK)
    const { data, error } = await adminClient
      .from('push_device_tokens')
      .select('user_id')
      .in('user_id', chunk)
      .eq('notifications_enabled', true)

    if (error) throw new Error(`listUserIdsWithTokens: ${error.message}`)
    for (const row of data ?? []) {
      withTokens.push(row.user_id as string)
    }
  }

  return [...new Set(withTokens)]
}

export async function enqueueImmediatePush({
  articleId,
  stream,
  title,
  slug,
}: {
  articleId: string
  stream: 'standard' | 'pulse'
  title: string
  slug: string
}): Promise<number> {
  const guestTokens = await listGuestTokens()
  const recipientIds = await getRecipients(stream)
  const userIds = await listUserIdsWithTokens(recipientIds)

  const guestRows = guestTokens.map((token) => ({
    audience: 'guest' as const,
    token,
    user_id: null,
    article_id: articleId,
    title,
    slug,
    content_stream: stream,
  }))

  const userRows = userIds.map((userId) => ({
    audience: 'user' as const,
    token: null,
    user_id: userId,
    article_id: articleId,
    title,
    slug,
    content_stream: stream,
  }))

  if (guestRows.length === 0 && userRows.length === 0) return 0

  let enqueued = 0
  for (let i = 0; i < guestRows.length; i += CHUNK) {
    enqueued += await insertOutboxRowsIgnoreDuplicates(
      'push_immediate_outbox',
      guestRows.slice(i, i + CHUNK)
    )
  }
  for (let i = 0; i < userRows.length; i += CHUNK) {
    enqueued += await insertOutboxRowsIgnoreDuplicates(
      'push_immediate_outbox',
      userRows.slice(i, i + CHUNK)
    )
  }

  return enqueued
}

export type ImmediateOutboxRow = {
  id: string
  audience: 'guest' | 'user'
  token: string | null
  user_id: string | null
  article_id: string
  title: string
  slug: string
  content_stream: 'standard' | 'pulse'
  attempts: number
}

export type DigestOutboxRow = {
  id: string
  audience: 'guest' | 'user'
  token: string | null
  user_id: string | null
  batch_key: string
  body: string
  content_stream: 'standard' | 'pulse'
  attempts: number
}

export async function fetchUnsentImmediateRows(limit: number): Promise<ImmediateOutboxRow[]> {
  const adminClient = getAdminClient()
  const { data, error } = await adminClient
    .from('push_immediate_outbox')
    .select('id, audience, token, user_id, article_id, title, slug, content_stream, attempts')
    .is('sent_at', null)
    .lt('attempts', 15)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`fetchUnsentImmediateRows: ${error.message}`)
  return (data ?? []) as ImmediateOutboxRow[]
}

export async function fetchUnsentDigestRows(limit: number): Promise<DigestOutboxRow[]> {
  const adminClient = getAdminClient()
  const { data, error } = await adminClient
    .from('push_digest_outbox')
    .select('id, audience, token, user_id, batch_key, body, content_stream, attempts')
    .is('sent_at', null)
    .lt('attempts', 15)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`fetchUnsentDigestRows: ${error.message}`)
  return (data ?? []) as DigestOutboxRow[]
}

export async function markImmediateSent(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const adminClient = getAdminClient()
  await adminClient
    .from('push_immediate_outbox')
    .update({ sent_at: new Date().toISOString(), last_error: null })
    .in('id', ids)
}

export async function markDigestSent(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const adminClient = getAdminClient()
  await adminClient
    .from('push_digest_outbox')
    .update({ sent_at: new Date().toISOString(), last_error: null })
    .in('id', ids)
}

export async function recordImmediateFailure(id: string, message: string, attempts: number): Promise<void> {
  const adminClient = getAdminClient()
  const nextAttempts = attempts + 1
  await adminClient
    .from('push_immediate_outbox')
    .update({
      attempts: nextAttempts,
      last_error: message.slice(0, 2000),
      ...(nextAttempts >= 15 ? { sent_at: new Date().toISOString() } : {}),
    })
    .eq('id', id)
}

export async function recordDigestFailure(id: string, message: string, attempts: number): Promise<void> {
  const adminClient = getAdminClient()
  const nextAttempts = attempts + 1
  await adminClient
    .from('push_digest_outbox')
    .update({
      attempts: nextAttempts,
      last_error: message.slice(0, 2000),
      ...(nextAttempts >= 15 ? { sent_at: new Date().toISOString() } : {}),
    })
    .eq('id', id)
}
