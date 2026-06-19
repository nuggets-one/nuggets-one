import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import {
  buildDailyDigestBatchKey,
  digestTitleForOverflow,
  parseOverflowCount,
  partitionRecipientsByDailyCap,
  utcDayStartIso,
} from '@/lib/notifications/daily-cap'
import { enqueuePushOnPublish } from '@/lib/notifications/push-publish'
import { resolvePushImageUrl } from '@/lib/notifications/push-image-url'
import { triggerPushTopicSender } from '@/lib/notifications/push-topic-sender'
import { buildSingleNotificationRows } from '@/lib/notifications/single-rows'
import { streamPrefColumn } from '@/lib/notifications/stream-prefs'
import type { ContentStream } from '@/types/article'

export const FAN_OUT_CAP = 5000

export type FanOutResult = {
  inserted: number
  mode: 'sync' | 'queued'
  pushError?: string
  pushMode?: 'immediate' | 'digest'
}

/**
 * batch_key format (frozen — BLUEPRINT §12.6):
 * {content_stream}:{YYYY-MM-DD HH:00} in UTC
 * e.g. "standard:2026-04-28 14:00"
 */
export function buildBatchKey(
  stream: ContentStream,
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

async function insertChunkRows(
  chunk: Array<{
    user_id: string
    article_id: string
    kind: 'single'
    content_stream: ContentStream
    title: string
    batch_key: null
    is_read: boolean
  }>
): Promise<number> {
  const adminClient = getAdminClient()
  let inserted = 0

  for (const row of chunk) {
    const { error: insertError } = await adminClient.from('user_notifications').insert(row)
    if (insertError && insertError.code !== '23505') {
      throw new Error(`upsertNotifications insert error: ${insertError.message}`)
    }
    if (!insertError) inserted += 1
  }

  return inserted
}

async function getRecipientsFallback(stream: ContentStream): Promise<string[]> {
  const adminClient = getAdminClient()
  const streamField = streamPrefColumn(stream)

  const { data: prefs, error: prefsError } = await adminClient
    .from('notification_preferences')
    .select('user_id, mute_all, stream_standard, stream_pulse, stream_charts, stream_tech_vc, stream_geopolitics')

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
  stream: ContentStream
): Promise<string[]> {
  const adminClient = getAdminClient()
  const streamCol = streamPrefColumn(stream)

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

  console.warn('[getRecipients] rpc failed, falling back to listUsers path:', {
    code: error.code,
    message: error.message,
  })
  return getRecipientsFallback(stream)
}

const UPSERT_CHUNK = 500

async function getTodaySingleCountsByUser(
  userIds: string[],
  stream: ContentStream,
  dayStart: string
): Promise<Map<string, number>> {
  const adminClient = getAdminClient()
  const counts = new Map<string, number>()

  for (let i = 0; i < userIds.length; i += UPSERT_CHUNK) {
    const chunk = userIds.slice(i, i + UPSERT_CHUNK)
    const { data, error } = await adminClient
      .from('user_notifications')
      .select('user_id')
      .in('user_id', chunk)
      .eq('kind', 'single')
      .eq('content_stream', stream)
      .gte('created_at', dayStart)

    if (error) throw new Error(`getTodaySingleCountsByUser: ${error.message}`)

    for (const row of data ?? []) {
      const uid = row.user_id as string
      counts.set(uid, (counts.get(uid) ?? 0) + 1)
    }
  }

  return counts
}

async function upsertDigestOverflowRows({
  userIds,
  stream,
  batchKey,
}: {
  userIds: string[]
  stream: ContentStream
  batchKey: string
}): Promise<number> {
  if (userIds.length === 0) return 0

  const adminClient = getAdminClient()
  let affected = 0

  for (let i = 0; i < userIds.length; i += UPSERT_CHUNK) {
    const chunk = userIds.slice(i, i + UPSERT_CHUNK)

    const { data: existing, error: fetchError } = await adminClient
      .from('user_notifications')
      .select('user_id, body, title')
      .in('user_id', chunk)
      .eq('batch_key', batchKey)
      .eq('kind', 'digest')

    if (fetchError) {
      throw new Error(`upsertDigestOverflowRows fetch: ${fetchError.message}`)
    }

    const existingByUser = new Map(
      (existing ?? []).map((row) => [row.user_id as string, row])
    )

    const rows = chunk.map((userId) => {
      const prev = existingByUser.get(userId)
      const nextCount = parseOverflowCount(
        (prev?.body as string | null) ?? null,
        (prev?.title as string | null) ?? null
      ) + 1

      return {
        user_id: userId,
        article_id: null,
        kind: 'digest' as const,
        content_stream: stream,
        title: digestTitleForOverflow(stream, nextCount),
        body: String(nextCount),
        batch_key: batchKey,
        is_read: false,
      }
    })

    const { error, count } = await adminClient.from('user_notifications').upsert(rows, {
      onConflict: 'user_id,batch_key',
      count: 'exact',
    })

    if (error) {
      console.warn('[upsertDigestOverflowRows] upsert error:', {
        code: error.code,
        message: error.message,
      })
      continue
    }

    affected += count ?? rows.length
  }

  return affected
}

/**
 * Upsert in-app notifications per recipient.
 * Blueprint §6.6: up to DAILY_SINGLE_CAP singles per UTC day; overflow rolls into one digest row.
 * Singles are idempotent via ux_user_notifications_user_article_single.
 */
export async function upsertNotifications({
  recipientIds,
  articleId,
  stream,
  title,
}: {
  recipientIds: string[]
  articleId: string
  stream: ContentStream
  title: string
}): Promise<number> {
  const adminClient = getAdminClient()
  if (recipientIds.length === 0) return 0

  const uniqueRecipients = [...new Set(recipientIds)]
  const dayStart = utcDayStartIso()
  const singleCounts = await getTodaySingleCountsByUser(uniqueRecipients, stream, dayStart)
  const { singleRecipients, overflowRecipients } = partitionRecipientsByDailyCap(
    uniqueRecipients,
    singleCounts
  )

  let inserted = 0

  if (singleRecipients.length > 0) {
    const rows = buildSingleNotificationRows({
      recipientIds: singleRecipients,
      articleId,
      stream,
      title,
    })

    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK)
      const { error, count } = await adminClient
        .from('user_notifications')
        .upsert(chunk, {
          onConflict: 'user_id,article_id',
          ignoreDuplicates: true,
          count: 'exact',
        })

      if (error?.code === '42P10') {
        inserted += await insertChunkRows(chunk)
        continue
      }

      if (error) {
        console.warn('[upsertNotifications] upsert failed, falling back to row inserts:', {
          code: error.code,
          message: error.message,
        })
        inserted += await insertChunkRows(chunk)
        continue
      }
      inserted += count ?? 0
    }
  }

  if (overflowRecipients.length > 0) {
    const batchKey = buildDailyDigestBatchKey(stream)
    inserted += await upsertDigestOverflowRows({
      userIds: overflowRecipients,
      stream,
      batchKey,
    })
  }

  return inserted
}

export async function fanOutOnPublish({
  articleId,
  stream,
  title,
  slug,
  imageUrl,
  pushNotifyImmediately = false,
}: {
  articleId: string
  stream: ContentStream
  title: string
  slug: string
  imageUrl?: string | null
  pushNotifyImmediately?: boolean
}): Promise<FanOutResult> {
  const adminClient = getAdminClient()
  const recipients = await getRecipients(stream)
  const batchKey = buildBatchKey(stream)

  const runPushEnqueue = async (): Promise<Pick<FanOutResult, 'pushError' | 'pushMode'>> => {
    try {
      const pushResult = await enqueuePushOnPublish({
        articleId,
        stream,
        title,
        slug,
        imageUrl: resolvePushImageUrl(imageUrl),
        pushNotifyImmediately,
      })
      triggerPushTopicSender()
      return { pushMode: pushResult.mode }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[fanOutOnPublish] push enqueue error:', message)
      return { pushError: message }
    }
  }

  if (recipients.length <= FAN_OUT_CAP) {
    const inserted = await upsertNotifications({
      recipientIds: recipients,
      articleId,
      stream,
      title,
    })
    const push = await runPushEnqueue()
    return { inserted, mode: 'sync', ...push }
  }

  const syncSlice = recipients.slice(0, FAN_OUT_CAP)
  await upsertNotifications({
    recipientIds: syncSlice,
    articleId,
    stream,
    title,
  })
  const push = await runPushEnqueue()

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
      return { inserted: FAN_OUT_CAP, mode: 'sync', ...push }
    }
    throw new Error(`pending_fanout insert error: ${queueError.message}`)
  }

  return { inserted: FAN_OUT_CAP, mode: 'queued', ...push }
}
