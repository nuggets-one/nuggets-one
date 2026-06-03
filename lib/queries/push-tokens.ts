import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'

export type PushDeviceToken = {
  user_id: string | null
  token: string
  platform: 'android'
  install_id?: string
}

export async function listTokensForUser(userId: string): Promise<string[]> {
  const adminClient = getAdminClient()
  const { data, error } = await adminClient
    .from('push_device_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('notifications_enabled', true)

  if (error) {
    throw new Error(`listTokensForUser error: ${error.message}`)
  }

  return (data ?? []).map((row) => row.token as string)
}

export async function listTokensForUsers(userIds: string[]): Promise<Map<string, string[]>> {
  const adminClient = getAdminClient()
  if (userIds.length === 0) return new Map()

  const { data, error } = await adminClient
    .from('push_device_tokens')
    .select('user_id, token')
    .in('user_id', userIds)
    .eq('notifications_enabled', true)

  if (error) {
    throw new Error(`listTokensForUsers error: ${error.message}`)
  }

  const byUser = new Map<string, string[]>()
  for (const row of data ?? []) {
    const userId = row.user_id as string
    const token = row.token as string
    const existing = byUser.get(userId) ?? []
    existing.push(token)
    byUser.set(userId, existing)
  }

  return byUser
}

export async function pruneInvalidTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return

  const adminClient = getAdminClient()
  const { error } = await adminClient.from('push_device_tokens').delete().in('token', tokens)

  if (error) {
    console.warn('[push-tokens] pruneInvalidTokens error:', error.message)
  }
}
