'use client'

import { useEffect, useRef } from 'react'
import { subscribeForegroundWebPushMessages } from '@/lib/push/get-fcm-web-token'
import { subscribeAuthChanges } from '@/lib/auth/browser-auth-events'
import {
  isWebPushCapacitorNative,
  refreshWebPushRegistration,
  subscribeWebPushState,
  teardownWebPushOnLogout,
} from '@/lib/push/web-push'

/**
 * Passive web push lifecycle: re-register on auth change/focus, teardown on
 * logout. Driven by Supabase auth events (no `/api/auth/status` polling).
 * Does not auto-prompt — use enableWebPush() from account/bell UI.
 */
export function WebPushRegistration() {
  const authenticatedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isWebPushCapacitorNative()) return

    let cancelled = false
    let unsubscribeForeground: (() => void) | null = null

    void subscribeForegroundWebPushMessages().then((unsub) => {
      if (cancelled) {
        unsub?.()
        return
      }
      unsubscribeForeground = unsub
    })

    async function handleAuth(authenticated: boolean) {
      if (cancelled) return

      if (!authenticated && authenticatedRef.current) {
        await teardownWebPushOnLogout()
      } else if (authenticated) {
        await refreshWebPushRegistration()
      }

      authenticatedRef.current = authenticated
    }

    // Fires immediately with the current session (INITIAL_SESSION), then on
    // every login/logout/token refresh.
    const unsubscribeAuth = subscribeAuthChanges(({ authenticated }) => {
      void handleAuth(authenticated)
    })

    const onFocus = () => {
      if (authenticatedRef.current) void refreshWebPushRegistration()
    }
    window.addEventListener('focus', onFocus)

    const unsubState = subscribeWebPushState(() => {
      // no UI here — state consumers use subscribeWebPushState directly
    })

    return () => {
      cancelled = true
      unsubscribeForeground?.()
      unsubscribeAuth()
      window.removeEventListener('focus', onFocus)
      unsubState()
    }
  }, [])

  return null
}
