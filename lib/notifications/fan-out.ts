import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
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
function isMissingNotificationRpc(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST202' || /get_notification_recipients/i.test(error.message ?? '')
}

async function getRecipientsFallback(stream: 'standard' | 'pulse'): Promise<string[]> {
  const adminClient = getAdminClient()
  const streamField = stream === 'pulse' ? 'stream_pulse' : 'stream_standard'

  const { data: prefs, error: prefsError } = await adminClient
    .from('notification_preferences')
    .select('user_id, mute_all, stream_standard, stream_pulse')

  if (prefsError) throw new Error(`getRecipients fallback prefs error: ${prefsError.message}`)

  const prefByUser = new Map((prefs ?? []).map((row) => [row.user_id as string, row]))
  const recipientIds: string[] = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data: listed, error: listError } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (listError) throw new Error(`getRecipients fallback listUsers error: ${listError.message}`)

    for (const user of listed.users) {
      const pref = prefByUser.get(user.id)
      if (pref?.mute_all === true) continue
      const streamEnabled = pref?.[streamField as keyof typeof pref]
      if (streamEnabled === false) continue
      recipientIds.push(user.id)
    }

    if (listed.users.length < perPage) break
    page += 1
  }

  return recipientIds
}

export async function getRecipients(
  stream: 'standard' | 'pulse'
): Promise<string[]> {
  const adminClient = getAdminClient()
  const streamCol = stream === 'pulse' ? 'stream_pulse' : 'stream_standard'

  const { data, error } = await adminClient.rpc(
    'get_notification_recipients',
    { p_stream_col: streamCol }
  )

  if (!error) {
    return (data ?? []).map((r: { user_id: string }) => r.user_id)
  }

  if (isMissingNotificationRpc(error)) {
    return getRecipientsFallback(stream)
  }

  throw new Error(`getRecipients error: ${error.message}`)
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
  const adminClient = getAdminClient()
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

    if (error?.code === '42P10') {
      // Partial unique index only — insert rows and ignore duplicate pairs.
      for (const row of chunk) {
        const { error: insertError } = await adminClient.from('user_notifications').insert(row)
        if (insertError && insertError.code !== '23505') {
          throw new Error(`upsertNotifications insert error: ${insertError.message}`)
        }
      }
      inserted += chunk.length
      continue
    }

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
  const adminClient = getAdminClient()
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

  const { error: queueError } = await adminClient.from('pending_fanout').insert({
    article_id: articleId,
    stream,
    title,
    batch_key: batchKey,
    remaining_user_ids: recipients.slice(FAN_OUT_CAP),
  })

  if (queueError) {
    if (queueError.code === 'PGRST205' || /pending_fanout/i.test(queueError.message ?? '')) {
      console.warn(
        '[fanOutOnPublish] pending_fanout table missing; remaining recipients were not queued:',
        recipients.length - FAN_OUT_CAP
      )
      return { inserted: FAN_OUT_CAP, mode: 'sync' }
    }
    throw new Error(`pending_fanout insert error: ${queueError.message}`)
  }

  return { inserted: FAN_OUT_CAP, mode: 'queued' }
}
