'use client'

import { useEffect, useRef } from 'react'
import {
  isWebPushCapacitorNative,
  refreshWebPushRegistration,
  subscribeWebPushState,
  teardownWebPushOnLogout,
} from '@/lib/push/web-push'

type AuthStatus = {
  authenticated: boolean
}

async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch('/api/auth/status', { cache: 'no-store' })
  if (!res.ok) return { authenticated: false }
  return (await res.json()) as AuthStatus
}

/**
 * Passive web push lifecycle: re-register on auth/focus, teardown on logout.
 * Does not auto-prompt — use enableWebPush() from account/bell UI.
 */
export function WebPushRegistration() {
  const authenticatedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isWebPushCapacitorNative()) return

    let cancelled = false

    async function onAuthMaybeChanged() {
      if (cancelled) return

      const auth = await fetchAuthStatus()

      if (!auth.authenticated && authenticatedRef.current) {
        await teardownWebPushOnLogout()
      } else if (auth.authenticated) {
        await refreshWebPushRegistration()
      }

      authenticatedRef.current = auth.authenticated
    }

    void onAuthMaybeChanged()

    const authPollTimer = setInterval(() => {
      void onAuthMaybeChanged()
    }, 5000)

    const onFocus = () => {
      void onAuthMaybeChanged()
    }
    window.addEventListener('focus', onFocus)

    const unsubState = subscribeWebPushState(() => {
      // no UI here — state consumers use subscribeWebPushState directly
    })

    return () => {
      cancelled = true
      clearInterval(authPollTimer)
      window.removeEventListener('focus', onFocus)
      unsubState()
    }
  }, [])

  return null
}
