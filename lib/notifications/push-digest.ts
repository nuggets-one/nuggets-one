import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import { getPushDigestIntervalHours } from '@/lib/queries/site-settings'
import { enqueueDigestTopicPush } from '@/lib/notifications/push-topic-outbox'

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

    await enqueueDigestTopicPush({ batchKey, stream, count })

    await adminClient.from('push_digest_buffer').delete().eq('batch_key', batchKey)
    flushed += 1
  }

  return flushed
}

export async function getDigestIntervalForPublish(): Promise<number> {
  return getPushDigestIntervalHours()
}
