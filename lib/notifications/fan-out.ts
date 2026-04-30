import 'server-only'
import { adminClient } from '@/lib/supabase/admin'
import { buildSingleNotificationRows } from '@/lib/notifications/single-rows'

export const FAN_OUT_CAP = 5000

export type FanOutResult = {
  inserted: number
  mode: 'sync' | 'queued'
}

/**
 * batch_key format (frozen — BLUEPRINT §12.6):
 * {content_stream}:{YYYY-MM-DD HH:00} in UTC
 * e.g. "standard:2026-04-28 14:00"
 */
export function buildBatchKey(
  stream: 'standard' | 'pulse',
  now: Date = new Date()
): string {
  const y = now.getUTCFullYear()
  const mo = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const h = String(now.getUTCHours()).padStart(2, '0')
  return `${stream}:${y}-${mo}-${d} ${h}:00`
}

/**
 * Recipient query — LEFT JOIN so users without a
 * notification_preferences row still receive notifications.
 * Defaults baked in via COALESCE (BLUEPRINT §6.6).
 */
export async function getRecipients(
  stream: 'standard' | 'pulse'
): Promise<string[]> {
  const streamCol = stream === 'pulse' ? 'stream_pulse' : 'stream_standard'

  const { data, error } = await adminClient.rpc(
    'get_notification_recipients',
    { p_stream_col: streamCol }
  )

  if (error) throw new Error(`getRecipients error: ${error.message}`)
  return (data ?? []).map((r: { user_id: string }) => r.user_id)
}

/**
 * Upsert a single-article notification for each recipient.
 * Idempotent via ux_user_notifications_user_article_single index.
 * Chunked at 500 rows to stay within Supabase payload limits.
 */
export async function upsertNotifications({
  recipientIds,
  articleId,
  stream,
  title,
}: {
  recipientIds: string[]
  articleId: string
  stream: 'standard' | 'pulse'
  title: string
}): Promise<number> {
  if (recipientIds.length === 0) return 0

  const rows = buildSingleNotificationRows({ recipientIds, articleId, stream, title })

  const CHUNK = 500
  let inserted = 0

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error, count } = await adminClient
      .from('user_notifications')
      .upsert(chunk, {
        onConflict: 'user_id,article_id',
        ignoreDuplicates: true,
        count: 'exact',
      })

    if (error) throw new Error(`upsertNotifications error: ${error.message}`)
    inserted += count ?? 0
  }

  return inserted
}


/**
 * Main fan-out entry point called by the publish handler.
 * Synchronous up to FAN_OUT_CAP recipients.
 * Above cap: inserts a pending_fanout row for cron drain.
 */
export async function fanOutOnPublish({
  articleId,
  stream,
  title,
}: {
  articleId: string
  stream: 'standard' | 'pulse'
  title: string
}): Promise<FanOutResult> {
  const recipients = await getRecipients(stream)
  const batchKey = buildBatchKey(stream)

  if (recipients.length <= FAN_OUT_CAP) {
    const inserted = await upsertNotifications({
      recipientIds: recipients,
      articleId,
      stream,
      title,
    })
    return { inserted, mode: 'sync' }
  }

  const syncSlice = recipients.slice(0, FAN_OUT_CAP)
  await upsertNotifications({
    recipientIds: syncSlice,
    articleId,
    stream,
    title,
  })

  await adminClient.from('pending_fanout').insert({
    article_id: articleId,
    stream,
    title,
    batch_key: batchKey,
    remaining_user_ids: recipients.slice(FAN_OUT_CAP),
  })

  return { inserted: FAN_OUT_CAP, mode: 'queued' }
}
