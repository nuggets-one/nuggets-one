import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'

export type RegisterPushTokenInput = {
  installId: string
  token: string
  platform: 'android'
  appVersion?: string | null
  notificationsEnabled?: boolean
  userId?: string | null
}

export async function upsertPushDeviceToken(input: RegisterPushTokenInput): Promise<void> {
  const adminClient = getAdminClient()
  const now = new Date().toISOString()

  const row = {
    install_id: input.installId,
    token: input.token,
    platform: input.platform,
    app_version: input.appVersion ?? null,
    notifications_enabled: input.notificationsEnabled ?? true,
    last_seen_at: now,
    updated_at: now,
    user_id: input.userId ?? null,
  }

  const { data: existingByToken } = await adminClient
    .from('push_device_tokens')
    .select('install_id')
    .eq('token', input.token)
    .maybeSingle()

  if (existingByToken) {
    const { error } = await adminClient.from('push_device_tokens').update(row).eq('token', input.token)
    if (error) throw new Error(`upsertPushDeviceToken: ${error.message}`)
    return
  }

  const { error } = await adminClient.from('push_device_tokens').upsert(row, { onConflict: 'install_id' })

  if (error) {
    throw new Error(`upsertPushDeviceToken: ${error.message}`)
  }
}

/** Logout: detach identity but keep token for guest re-engagement. */
export async function detachPushDeviceToken(installId: string, token: string): Promise<boolean> {
  const adminClient = getAdminClient()

  const { data, error } = await adminClient
    .from('push_device_tokens')
    .update({
      user_id: null,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('install_id', installId)
    .eq('token', token)
    .select('id')

  if (error) {
    throw new Error(`detachPushDeviceToken: ${error.message}`)
  }

  return (data?.length ?? 0) > 0
}
