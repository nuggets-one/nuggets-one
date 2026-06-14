'use server'

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { syncPushTopicsForUser } from '@/lib/push/topic-sync'
import { getAdminClient } from '@/lib/supabase/admin'

export async function markNotificationReadAction(
  notificationId: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('user_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id)
}

/** Blueprint §6.6b — mark all rows sharing a digest batch_key read on summary tap. */
export async function markBatchNotificationsReadAction(batchKey: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !batchKey) return

  await supabase
    .from('user_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('batch_key', batchKey)
    .eq('is_read', false)
}

export async function markAllReadAction(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('user_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false)
}

export async function lazyCreatePreferencesAction(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        mute_all: false,
        stream_standard: true,
        stream_pulse: true,
        stream_charts: true,
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
}

export async function updatePreferencesAction(prefs: {
  mute_all?: boolean
  stream_standard?: boolean
  stream_pulse?: boolean
  stream_charts?: boolean
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.warn('[notifications] preference update failed:', error.message)
    return
  }

  const adminClient = getAdminClient()
  const { data } = await adminClient
    .from('notification_preferences')
    .select('mute_all, stream_standard, stream_pulse, stream_charts')
    .eq('user_id', user.id)
    .maybeSingle()

  await syncPushTopicsForUser(user.id, {
    mute_all: data?.mute_all === true,
    stream_standard: data?.stream_standard !== false,
    stream_pulse: data?.stream_pulse !== false,
    stream_charts: data?.stream_charts !== false,
  })
}
