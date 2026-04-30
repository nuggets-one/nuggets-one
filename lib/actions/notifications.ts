'use server'

import { createClient } from '@/lib/supabase/server'

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
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
}

export async function updatePreferencesAction(prefs: {
  mute_all?: boolean
  stream_standard?: boolean
  stream_pulse?: boolean
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notification_preferences')
    .upsert(
      { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
}
