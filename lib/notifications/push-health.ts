import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import { isPushSendConfigured } from '@/lib/notifications/push-send'

/** Backlog at or above this count is reported as degraded (when FCM is configured). */
export const PUSH_BACKLOG_DEGRADED_THRESHOLD = 50

export type PushHealthStatus = 'ok' | 'degraded' | 'misconfigured'

export type PushHealthSnapshot = {
  configured: boolean
  status: PushHealthStatus
  unsent_topic_count: number
  unsent_immediate_count: number
  unsent_digest_count: number
  pending_fanout_count: number
  digest_buffer_count: number
  total_backlog: number
}

export async function getPushHealthSnapshot(): Promise<PushHealthSnapshot> {
  const adminClient = getAdminClient()
  const configured = isPushSendConfigured()

  const [topic, immediate, digest, fanout, digestBuffer] = await Promise.all([
    adminClient
      .from('push_topic_outbox')
      .select('id', { count: 'exact', head: true })
      .is('sent_at', null)
      .lt('attempts', 15),
    adminClient
      .from('push_immediate_outbox')
      .select('id', { count: 'exact', head: true })
      .is('sent_at', null)
      .lt('attempts', 15),
    adminClient
      .from('push_digest_outbox')
      .select('id', { count: 'exact', head: true })
      .is('sent_at', null)
      .lt('attempts', 15),
    adminClient
      .from('pending_fanout')
      .select('id', { count: 'exact', head: true })
      .is('drained_at', null),
    adminClient.from('push_digest_buffer').select('batch_key', { count: 'exact', head: true }),
  ])

  const unsent_topic_count = topic.count ?? 0
  const unsent_immediate_count = immediate.count ?? 0
  const unsent_digest_count = digest.count ?? 0
  const pending_fanout_count = fanout.count ?? 0
  const digest_buffer_count = digestBuffer.count ?? 0
  const total_backlog =
    unsent_topic_count +
    unsent_immediate_count +
    unsent_digest_count +
    pending_fanout_count +
    digest_buffer_count

  let status: PushHealthStatus
  if (!configured) {
    status = 'misconfigured'
  } else if (total_backlog >= PUSH_BACKLOG_DEGRADED_THRESHOLD) {
    status = 'degraded'
  } else {
    status = 'ok'
  }

  return {
    configured,
    status,
    unsent_topic_count,
    unsent_immediate_count,
    unsent_digest_count,
    pending_fanout_count,
    digest_buffer_count,
    total_backlog,
  }
}
