import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import { isPushSendConfigured, sendPushForOutboxRows, type PushOutboxRow } from '@/lib/notifications/push-send'

const ENQUEUE_CHUNK = 500
const DRAIN_BATCH = 100
const MAX_DRAIN_ATTEMPTS = 15

export async function enqueuePushOutbox({
  recipientIds,
  articleId,
  stream,
  title,
  slug,
}: {
  recipientIds: string[]
  articleId: string
  stream: 'standard' | 'pulse'
  title: string
  slug: string
}): Promise<number> {
  if (recipientIds.length === 0) return 0

  const adminClient = getAdminClient()
  const uniqueRecipients = [...new Set(recipientIds)]
  let enqueued = 0

  for (let i = 0; i < uniqueRecipients.length; i += ENQUEUE_CHUNK) {
    const chunk = uniqueRecipients.slice(i, i + ENQUEUE_CHUNK)

    const { data: tokenRows, error: tokenError } = await adminClient
      .from('push_device_tokens')
      .select('user_id')
      .in('user_id', chunk)

    if (tokenError) {
      console.warn('[enqueuePushOutbox] token lookup error:', tokenError.message)
      continue
    }

    const usersWithTokens = [...new Set((tokenRows ?? []).map((row) => row.user_id as string))]
    if (usersWithTokens.length === 0) continue

    const rows = usersWithTokens.map((userId) => ({
      user_id: userId,
      article_id: articleId,
      title,
      slug,
      content_stream: stream,
    }))

    const { error: insertError, count } = await adminClient
      .from('push_outbox')
      .upsert(rows, {
        onConflict: 'user_id,article_id',
        ignoreDuplicates: true,
        count: 'exact',
      })

    if (insertError) {
      console.warn('[enqueuePushOutbox] insert error:', insertError.message)
      continue
    }

    enqueued += count ?? 0
  }

  return enqueued
}

export async function drainPushOutbox(): Promise<{ drained: number; sent: number }> {
  if (!isPushSendConfigured()) {
    return { drained: 0, sent: 0 }
  }

  const adminClient = getAdminClient()

  const { data: pending, error: fetchError } = await adminClient
    .from('push_outbox')
    .select('id, user_id, article_id, title, slug, content_stream, attempts')
    .is('sent_at', null)
    .lt('attempts', MAX_DRAIN_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(DRAIN_BATCH)

  if (fetchError) {
    throw new Error(`drainPushOutbox fetch error: ${fetchError.message}`)
  }

  if (!pending || pending.length === 0) {
    return { drained: 0, sent: 0 }
  }

  const rows = pending as PushOutboxRow[]
  let sendResult = { sent: 0, failed: 0, prunedTokens: 0 }

  try {
    sendResult = await sendPushForOutboxRows(rows)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[drainPushOutbox] send error:', message)

    for (const row of pending) {
      const attempts = Number(row.attempts ?? 0) + 1
      await adminClient
        .from('push_outbox')
        .update({
          attempts,
          last_error: message.slice(0, 2000),
          ...(attempts >= MAX_DRAIN_ATTEMPTS ? { sent_at: new Date().toISOString() } : {}),
        })
        .eq('id', row.id as string)
    }

    return { drained: 0, sent: 0 }
  }

  const now = new Date().toISOString()
  let drained = 0

  for (const row of pending) {
    const { error: updateError } = await adminClient
      .from('push_outbox')
      .update({ sent_at: now, last_error: null })
      .eq('id', row.id as string)

    if (!updateError) drained += 1
  }

  return { drained, sent: sendResult.sent }
}
