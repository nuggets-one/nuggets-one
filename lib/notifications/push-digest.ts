import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import { getPushDigestIntervalHours } from '@/lib/queries/site-settings'
import { getRecipients } from '@/lib/notifications/fan-out'
import { insertOutboxRowsIgnoreDuplicates } from '@/lib/notifications/outbox-insert'

export type DigestStream = 'standard' | 'pulse'

export function buildDigestBatchKey(
  stream: DigestStream,
  now: Date = new Date(),
  intervalHours: number
): string {
  const y = now.getUTCFullYear()
  const mo = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const h = now.getUTCHours()
  const windowStart = Math.floor(h / intervalHours) * intervalHours
  const hh = String(windowStart).padStart(2, '0')
  return `${stream}:${y}-${mo}-${d} ${hh}:00`
}

function parseBatchKeyWindowEnd(batchKey: string, intervalHours: number): Date | null {
  const match = batchKey.match(/^(standard|pulse):(\d{4})-(\d{2})-(\d{2}) (\d{2}):00$/)
  if (!match) return null
  const [, , y, mo, d, hh] = match
  const start = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), 0, 0, 0)
  return new Date(start + intervalHours * 60 * 60 * 1000)
}

export function streamPushLabel(stream: DigestStream): string {
  return stream === 'pulse' ? 'Market Pulse' : 'Nuggets'
}

export function digestBodyForCount(stream: DigestStream, count: number): string {
  const label = streamPushLabel(stream)
  if (count === 1) return `1 new ${label} update`
  return `${count} new ${label} updates`
}

export async function accumulateDigestBuffer({
  stream,
  title,
  intervalHours,
}: {
  stream: DigestStream
  title: string
  intervalHours: number
}): Promise<void> {
  const adminClient = getAdminClient()
  const batchKey = buildDigestBatchKey(stream, new Date(), intervalHours)

  const { data: existing } = await adminClient
    .from('push_digest_buffer')
    .select('article_count')
    .eq('batch_key', batchKey)
    .maybeSingle()

  if (existing) {
    const { error } = await adminClient
      .from('push_digest_buffer')
      .update({
        article_count: Number(existing.article_count ?? 0) + 1,
        sample_title: title,
        updated_at: new Date().toISOString(),
      })
      .eq('batch_key', batchKey)
    if (error) console.warn('[accumulateDigestBuffer] update error:', error.message)
    return
  }

  const { error } = await adminClient.from('push_digest_buffer').insert({
    batch_key: batchKey,
    content_stream: stream,
    article_count: 1,
    sample_title: title,
    interval_hours: intervalHours,
  })
  if (error) console.warn('[accumulateDigestBuffer] insert error:', error.message)
}

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
  const { data, error } = await adminClient
    .from('push_device_tokens')
    .select('user_id')
    .in('user_id', userIds)
    .eq('notifications_enabled', true)
    .not('user_id', 'is', null)

  if (error) throw new Error(`listUserIdsWithTokens: ${error.message}`)
  return [...new Set((data ?? []).map((row) => row.user_id as string))]
}

export async function flushCompletedDigestBuffers(now = new Date()): Promise<number> {
  const adminClient = getAdminClient()
  const { data: buffers, error } = await adminClient.from('push_digest_buffer').select('*')

  if (error) {
    console.warn('[flushCompletedDigestBuffers] fetch error:', error.message)
    return 0
  }

  let flushed = 0

  for (const buffer of buffers ?? []) {
    const batchKey = buffer.batch_key as string
    const stream = buffer.content_stream as DigestStream
    const intervalHours = Number(buffer.interval_hours ?? 1)
    const count = Number(buffer.article_count ?? 0)
    if (count <= 0) continue

    const windowEnd = parseBatchKeyWindowEnd(batchKey, intervalHours)
    if (!windowEnd || now < windowEnd) continue

    const body = digestBodyForCount(stream, count)
    const guestTokens = await listGuestTokens()
    const recipientIds = await getRecipients(stream)
    const userIdsWithTokens = await listUserIdsWithTokens(recipientIds)

    const guestRows = guestTokens.map((token) => ({
      audience: 'guest' as const,
      token,
      user_id: null,
      batch_key: batchKey,
      body,
      content_stream: stream,
    }))

    const userRows = userIdsWithTokens.map((userId) => ({
      audience: 'user' as const,
      token: null,
      user_id: userId,
      batch_key: batchKey,
      body,
      content_stream: stream,
    }))

    if (guestRows.length > 0) {
      await insertOutboxRowsIgnoreDuplicates('push_digest_outbox', guestRows)
    }
    if (userRows.length > 0) {
      await insertOutboxRowsIgnoreDuplicates('push_digest_outbox', userRows)
    }

    await adminClient.from('push_digest_buffer').delete().eq('batch_key', batchKey)
    flushed += 1
  }

  return flushed
}

export async function getDigestIntervalForPublish(): Promise<number> {
  return getPushDigestIntervalHours()
}
