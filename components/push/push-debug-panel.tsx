'use client'

import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { getOrCreateInstallId } from '@/lib/push/install-id'

type DebugState = {
  platform: string
  installId: string | null
  token: string | null
  lastRegisterStatus: string | null
}

export function PushDebugPanel() {
  const [state, setState] = useState<DebugState>({
    platform: 'web',
    installId: null,
    token: null,
    lastRegisterStatus: null,
  })

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    if (!Capacitor.isNativePlatform()) return

    let cancelled = false

    void (async () => {
      const installId = await getOrCreateInstallId()
      if (cancelled) return

      setState((prev) => ({
        ...prev,
        platform: Capacitor.getPlatform(),
        installId,
      }))

      const { PushNotifications } = await import('@capacitor/push-notifications')
      const regHandle = await PushNotifications.addListener('registration', (event) => {
        setState((prev) => ({ ...prev, token: event.value }))
      })

      return () => {
        void regHandle.remove()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  if (process.env.NODE_ENV === 'production') return null
  if (!Capacitor.isNativePlatform()) return null

  return (
    <div className="fixed bottom-2 left-2 z-[9999] max-w-xs rounded-lg border border-border bg-surface/95 p-2 text-[10px] text-muted shadow-panel">
      <div className="font-semibold text-primary">Push debug</div>
      <div>platform: {state.platform}</div>
      <div className="truncate">install: {state.installId ?? '…'}</div>
      <div className="truncate">token: {state.token ?? 'pending'}</div>
      {state.lastRegisterStatus ? <div>register: {state.lastRegisterStatus}</div> : null}
    </div>
  )
}
