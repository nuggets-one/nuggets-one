import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import { flushCompletedDigestBuffers } from '@/lib/notifications/push-digest'
import {
  fetchUnsentDigestRows,
  fetchUnsentImmediateRows,
  markDigestSent,
  markImmediateSent,
  recordDigestFailure,
  recordImmediateFailure,
} from '@/lib/notifications/push-immediate-outbox'
import {
  isPushSendConfigured,
  sendPushForDigestRows,
  sendPushForImmediateRows,
  sendPushForOutboxRows,
  type PushOutboxRow,
} from '@/lib/notifications/push-send'

const DRAIN_BATCH = 100
const MAX_DRAIN_ATTEMPTS = 15

async function drainLegacyPushOutbox(): Promise<{ drained: number; sent: number }> {
  const adminClient = getAdminClient()

  const { data: pending, error: fetchError } = await adminClient
    .from('push_outbox')
    .select('id, user_id, article_id, title, slug, content_stream, attempts')
    .is('sent_at', null)
    .lt('attempts', MAX_DRAIN_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(DRAIN_BATCH)

  if (fetchError || !pending?.length) {
    return { drained: 0, sent: 0 }
  }

  try {
    const sendResult = await sendPushForOutboxRows(pending as PushOutboxRow[])
    const now = new Date().toISOString()
    for (const row of pending) {
      await adminClient
        .from('push_outbox')
        .update({ sent_at: now, last_error: null })
        .eq('id', row.id as string)
    }
    return { drained: pending.length, sent: sendResult.sent }
  } catch {
    return { drained: 0, sent: 0 }
  }
}

async function drainImmediateOutbox(): Promise<{ drained: number; sent: number }> {
  const rows = await fetchUnsentImmediateRows(DRAIN_BATCH)
  if (rows.length === 0) return { drained: 0, sent: 0 }

  try {
    const result = await sendPushForImmediateRows(rows)
    await markImmediateSent(rows.map((r) => r.id))
    return { drained: rows.length, sent: result.sent }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    for (const row of rows) {
      await recordImmediateFailure(row.id, message, row.attempts)
    }
    return { drained: 0, sent: 0 }
  }
}

async function drainDigestOutbox(): Promise<{ drained: number; sent: number }> {
  const rows = await fetchUnsentDigestRows(DRAIN_BATCH)
  if (rows.length === 0) return { drained: 0, sent: 0 }

  try {
    const result = await sendPushForDigestRows(rows)
    await markDigestSent(rows.map((r) => r.id))
    return { drained: rows.length, sent: result.sent }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    for (const row of rows) {
      await recordDigestFailure(row.id, message, row.attempts)
    }
    return { drained: 0, sent: 0 }
  }
}

export async function drainPushOutbox(): Promise<{
  digestBuffersFlushed: number
  immediate: { drained: number; sent: number }
  digest: { drained: number; sent: number }
  legacy: { drained: number; sent: number }
}> {
  if (!isPushSendConfigured()) {
    return {
      digestBuffersFlushed: 0,
      immediate: { drained: 0, sent: 0 },
      digest: { drained: 0, sent: 0 },
      legacy: { drained: 0, sent: 0 },
    }
  }

  const digestBuffersFlushed = await flushCompletedDigestBuffers()
  const immediate = await drainImmediateOutbox()
  const digest = await drainDigestOutbox()
  const legacy = await drainLegacyPushOutbox()

  return { digestBuffersFlushed, immediate, digest, legacy }
}
