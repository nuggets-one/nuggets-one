import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import { syncTokenTopics } from '@/lib/notifications/push-send'
import {
  PUSH_TOPIC_BY_STREAM,
  getPushPreferencesForUser,
  topicsForPreferences,
  type PushPreferences,
} from '@/lib/notifications/push-topics'

const ALL_PUSH_TOPICS = Object.values(PUSH_TOPIC_BY_STREAM)

type TokenRow = {
  token: string
  notifications_enabled: boolean
}

export async function syncPushTopicsForToken({
  token,
  userId,
  notificationsEnabled,
}: {
  token: string
  userId?: string | null
  notificationsEnabled: boolean
}): Promise<boolean> {
  let desiredTopics: string[] = []

  if (notificationsEnabled) {
    if (userId) {
      desiredTopics = topicsForPreferences(await getPushPreferencesForUser(userId))
    } else {
      desiredTopics = ALL_PUSH_TOPICS
    }
  }

  const synced = await syncTokenTopics({
    token,
    desiredTopics,
    allTopics: ALL_PUSH_TOPICS,
  })

  const adminClient = getAdminClient()
  await adminClient
    .from('push_device_tokens')
    .update({
      last_topic_sync_at: synced ? new Date().toISOString() : null,
      failure_count: synced ? 0 : 1,
    })
    .eq('token', token)

  return synced
}

export async function syncPushTopicsForUser(
  userId: string,
  prefs?: PushPreferences
): Promise<number> {
  const adminClient = getAdminClient()
  const { data, error } = await adminClient
    .from('push_device_tokens')
    .select('token, notifications_enabled')
    .eq('user_id', userId)

  if (error) {
    console.warn('[push/topic-sync] token lookup failed:', error.message)
    return 0
  }

  const desiredTopics = topicsForPreferences(prefs ?? (await getPushPreferencesForUser(userId)))
  let syncedCount = 0

  for (const row of (data ?? []) as TokenRow[]) {
    const synced = await syncTokenTopics({
      token: row.token,
      desiredTopics: row.notifications_enabled ? desiredTopics : [],
      allTopics: ALL_PUSH_TOPICS,
    })

    await adminClient
      .from('push_device_tokens')
      .update({
        last_topic_sync_at: synced ? new Date().toISOString() : null,
        failure_count: synced ? 0 : 1,
      })
      .eq('token', row.token)

    if (synced) syncedCount += 1
  }

  return syncedCount
}

export async function unsubscribePushTokenFromAllTopics(token: string): Promise<void> {
  await syncTokenTopics({
    token,
    desiredTopics: [],
    allTopics: ALL_PUSH_TOPICS,
  })
}
