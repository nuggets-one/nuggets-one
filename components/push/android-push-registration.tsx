'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { detachPushToken, registerPushToken } from '@/lib/push/register-push-token'

type AuthStatus = {
  authenticated: boolean
}

function isCapacitorAndroid(): boolean {
  if (typeof window === 'undefined') return false

  const injected = (
    window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string }
    }
  ).Capacitor

  if (injected?.isNativePlatform?.()) {
    return injected.getPlatform?.() === 'android'
  }

  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch('/api/auth/status', { cache: 'no-store' })
  if (!res.ok) return { authenticated: false }
  return (await res.json()) as AuthStatus
}

export function AndroidPushRegistration() {
  const router = useRouter()
  const tokenRef = useRef<string | null>(null)
  const authenticatedRef = useRef(false)
  const setupStartedRef = useRef(false)
  const listenersReadyRef = useRef(false)

  useEffect(() => {
    if (!isCapacitorAndroid()) return

    let cancelled = false
    let removeListeners: (() => void) | undefined
    let authPollTimer: ReturnType<typeof setInterval> | undefined

    async function ensureListeners() {
      if (listenersReadyRef.current) return

      const { PushNotifications } = await import('@capacitor/push-notifications')

      const onToken = async (token: string) => {
        tokenRef.current = token
        await registerPushToken({ token })
      }

      const regHandle = await PushNotifications.addListener('registration', (event) => {
        void onToken(event.value)
      })

      const errHandle = await PushNotifications.addListener('registrationError', (error) => {
        console.warn('[push] registration error', error)
        setupStartedRef.current = false
      })

      const actionHandle = await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action) => {
          const data = action.notification.data
          const articleId = data?.articleId ?? data?.article_id
          const slug = data?.slug
          if (typeof articleId === 'string' && typeof slug === 'string') {
            router.push(`/nuggets/${articleId}/${slug}`)
            return
          }

          const stream = data?.stream
          if (stream === 'standard' || stream === 'pulse') {
            router.push(`/?stream=${stream}`)
          }
        }
      )

      removeListeners = () => {
        void regHandle.remove()
        void errHandle.remove()
        void actionHandle.remove()
        listenersReadyRef.current = false
      }

      listenersReadyRef.current = true
    }

    async function setupPush() {
      if (cancelled || setupStartedRef.current) return

      setupStartedRef.current = true

      try {
        await ensureListeners()

        const { PushNotifications } = await import('@capacitor/push-notifications')

        let perm = await PushNotifications.checkPermissions()
        if (perm.receive !== 'granted') {
          perm = await PushNotifications.requestPermissions()
        }
        if (perm.receive !== 'granted') {
          console.warn('[push] notification permission not granted:', perm.receive)
          setupStartedRef.current = false
          return
        }

        await PushNotifications.register()
      } catch (err) {
        console.warn('[push] setup failed', err)
        setupStartedRef.current = false
      }
    }

    async function onAuthMaybeChanged() {
      const auth = await fetchAuthStatus()

      if (!auth.authenticated && authenticatedRef.current && tokenRef.current) {
        await detachPushToken(tokenRef.current)
      }

      authenticatedRef.current = auth.authenticated

      if (tokenRef.current) {
        await registerPushToken({ token: tokenRef.current })
      } else {
        void setupPush()
      }
    }

    void setupPush()

    authPollTimer = setInterval(() => {
      void onAuthMaybeChanged()
    }, 5000)

    const onFocus = () => {
      void onAuthMaybeChanged()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      if (authPollTimer) clearInterval(authPollTimer)
      window.removeEventListener('focus', onFocus)
      removeListeners?.()
    }
  }, [router])

  return null
}
