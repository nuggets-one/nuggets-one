import 'server-only'

import { accumulateDigestBuffer, getDigestIntervalForPublish } from '@/lib/notifications/push-digest'
import { enqueueImmediateTopicPush } from '@/lib/notifications/push-topic-outbox'
import { getAdminClient } from '@/lib/supabase/admin'

export const PUSH_IMMEDIATE_DAILY_CAP_PER_STREAM = 5 as const

function utcDayStartIso(now = new Date()): string {
  const y = now.getUTCFullYear()
  const mo = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${d}T00:00:00.000Z`
}

async function hasImmediatePushCapacity(stream: 'standard' | 'pulse'): Promise<boolean> {
  const adminClient = getAdminClient()
  const { count, error } = await adminClient
    .from('push_topic_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'immediate')
    .eq('content_stream', stream)
    .gte('created_at', utcDayStartIso())

  if (error) {
    console.warn('[push-publish] immediate cap check failed:', error.message)
    return false
  }

  return (count ?? 0) < PUSH_IMMEDIATE_DAILY_CAP_PER_STREAM
}

export async function enqueuePushOnPublish({
  articleId,
  stream,
  title,
  slug,
  imageUrl,
  pushNotifyImmediately,
}: {
  articleId: string
  stream: 'standard' | 'pulse'
  title: string
  slug: string
  imageUrl?: string | null
  pushNotifyImmediately: boolean
}): Promise<void> {
  try {
    if (pushNotifyImmediately) {
      if (await hasImmediatePushCapacity(stream)) {
        await enqueueImmediateTopicPush({ articleId, stream, title, slug, imageUrl })
        return
      }

      const intervalHours = await getDigestIntervalForPublish()
      await accumulateDigestBuffer({ stream, title, intervalHours })
      return
    }

    const intervalHours = await getDigestIntervalForPublish()
    await accumulateDigestBuffer({ stream, title, intervalHours })
  } catch (err) {
    console.warn('[enqueuePushOnPublish] error:', err)
  }
}

/** @deprecated Legacy per-user push_outbox enqueue for in-flight rows. */
export async function enqueueLegacyPushOutbox({
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

  const { getAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = getAdminClient()
  const ENQUEUE_CHUNK = 500
  const uniqueRecipients = [...new Set(recipientIds)]
  let enqueued = 0

  for (let i = 0; i < uniqueRecipients.length; i += ENQUEUE_CHUNK) {
    const chunk = uniqueRecipients.slice(i, i + ENQUEUE_CHUNK)

    const { data: tokenRows, error: tokenError } = await adminClient
      .from('push_device_tokens')
      .select('user_id')
      .in('user_id', chunk)
      .eq('notifications_enabled', true)

    if (tokenError) {
      console.warn('[enqueueLegacyPushOutbox] token lookup error:', tokenError.message)
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
      console.warn('[enqueueLegacyPushOutbox] insert error:', insertError.message)
      continue
    }

    enqueued += count ?? 0
  }

  return enqueued
}
