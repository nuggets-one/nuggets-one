'use client'

import { getOrCreateInstallId } from '@/lib/push/install-id'

export async function registerPushToken({
  token,
  platform = 'android',
  notificationsEnabled = true,
}: {
  token: string
  platform?: 'android'
  notificationsEnabled?: boolean
}): Promise<boolean> {
  const installId = await getOrCreateInstallId()
  const res = await fetch('/api/push/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      install_id: installId,
      token,
      platform,
      app_version: '1.0',
      notifications_enabled: notificationsEnabled,
    }),
  })
  if (!res.ok) {
    console.warn('[push] register API failed', res.status)
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
