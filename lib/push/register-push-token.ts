'use client'

import { getOrCreateInstallId } from '@/lib/push/install-id'

export async function registerPushToken({
  token,
  platform = 'android',
  notificationsEnabled = true,
}: {
  token: string
  platform?: 'android' | 'ios' | 'web'
  notificationsEnabled?: boolean
}): Promise<boolean> {
  const installId = await getOrCreateInstallId()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const res = await fetch('/api/push/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      install_id: installId,
      token,
      platform,
      app_version: platform === 'web' ? 'web' : '1.0',
      timezone,
      notifications_enabled: notificationsEnabled,
    }),
  })
  if (!res.ok) {
    console.warn('[push] register API failed', res.status)
    return false
  }
  return true
}

export async function unregisterPushToken(token: string): Promise<boolean> {
  const res = await fetch('/api/push/unregister', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  if (!res.ok) {
    console.warn('[push] unregister API failed', res.status)
    return false
  }
  return true
}

export async function detachPushToken(token: string): Promise<void> {
  const installId = await getOrCreateInstallId()
  await fetch('/api/push/detach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ install_id: installId, token }),
  })
}
