import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import { upsertNotifications } from '@/lib/notifications/fan-out'

/** Max failed drain attempts before marking row drained (remaining IDs abandoned — see logs). */
export const MAX_FANOUT_DRAIN_ATTEMPTS = 15

export const DEFAULT_FANOUT_DRAIN_LIMIT = 25

export type FanoutDrainResult = {
  drained: number
}

export async function drainPendingFanout(
  limit = DEFAULT_FANOUT_DRAIN_LIMIT
): Promise<FanoutDrainResult> {
  const adminClient = getAdminClient()

  const { data: pending, error: fetchError } = await adminClient
    .from('pending_fanout')
    .select('*')
    .is('drained_at', null)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (fetchError) {
    throw new Error(`drainPendingFanout fetch: ${fetchError.message}`)
  }

  if (!pending?.length) {
    return { drained: 0 }
  }

  let totalDrained = 0

  for (const row of pending) {
    const rowId = row.id as string
    const attempts = Number(row.drain_attempts ?? 0)

    try {
      const recipientIds = row.remaining_user_ids as string[]
      const articleId = row.article_id as string
      const stream = row.stream as 'standard' | 'pulse'
      const title = row.title as string

      await upsertNotifications({
        recipientIds,
        articleId,
        stream,
        title,
      })

      await adminClient
        .from('pending_fanout')
        .update({ drained_at: new Date().toISOString() })
        .eq('id', rowId)

      totalDrained++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[drainPendingFanout] drain error for row', rowId, err)

      const nextAttempts = attempts + 1
      const abandoned = nextAttempts >= MAX_FANOUT_DRAIN_ATTEMPTS

      const { error: updateErr } = await adminClient
        .from('pending_fanout')
        .update({
          drain_attempts: nextAttempts,
          last_drain_error: message.slice(0, 2000),
          ...(abandoned ? { drained_at: new Date().toISOString() } : {}),
        })
        .eq('id', rowId)

      if (updateErr) {
        console.error('[drainPendingFanout] failed to record drain_attempts', rowId, updateErr)
      } else if (abandoned) {
        console.error(
          '[drainPendingFanout] abandoned pending_fanout row after max attempts:',
          rowId
        )
      }
    }
  }

  return { drained: totalDrained }
}
