'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { detachPushToken, registerPushToken } from '@/lib/push/register-push-token'
import { subscribeAuthChanges } from '@/lib/auth/browser-auth-events'
import { parseContentStream } from '@/lib/copy/streams'
import { buildFeedHrefForContentStream } from '@/lib/feed/scope'
import { CONTENT_STREAMS } from '@/types/article'

type NativePushPlatform = 'android' | 'ios'

function getNativePushPlatform(): NativePushPlatform | null {
  if (typeof window === 'undefined') return null

  const injected = (
    window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string }
    }
  ).Capacitor

  if (injected?.isNativePlatform?.()) {
    const platform = injected.getPlatform?.()
    if (platform === 'android' || platform === 'ios') return platform
    return null
  }

  if (!Capacitor.isNativePlatform()) return null

  const platform = Capacitor.getPlatform()
  if (platform === 'android' || platform === 'ios') return platform
  return null
}

export function NativePushRegistration() {
  const router = useRouter()
  const tokenRef = useRef<string | null>(null)
  const authenticatedRef = useRef(false)
  const setupStartedRef = useRef(false)
  const listenersReadyRef = useRef(false)

  useEffect(() => {
    const maybePlatform = getNativePushPlatform()
    if (maybePlatform !== 'android' && maybePlatform !== 'ios') return
    const platform: NativePushPlatform = maybePlatform

    let cancelled = false
    let removeListeners: (() => void) | undefined

    async function ensureListeners() {
      if (listenersReadyRef.current) return

      const { PushNotifications } = await import('@capacitor/push-notifications')

      const onToken = async (token: string) => {
        tokenRef.current = token
        await registerPushToken({ token, platform })
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
          if (typeof stream === 'string' && (CONTENT_STREAMS as readonly string[]).includes(stream)) {
            router.push(buildFeedHrefForContentStream(parseContentStream(stream)))
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

    async function onAuthMaybeChanged(authenticated: boolean) {
      if (cancelled) return

      if (!authenticated && authenticatedRef.current && tokenRef.current) {
        await detachPushToken(tokenRef.current)
      }

      authenticatedRef.current = authenticated

      if (tokenRef.current) {
        await registerPushToken({ token: tokenRef.current, platform })
      } else {
        void setupPush()
      }
    }

    void setupPush()

    // Auth events replace the old 5s `/api/auth/status` poll. INITIAL_SESSION
    // fires on subscribe, covering the initial token association.
    const unsubscribeAuth = subscribeAuthChanges(({ authenticated }) => {
      void onAuthMaybeChanged(authenticated)
    })

    const onFocus = () => {
      if (tokenRef.current) {
        void registerPushToken({ token: tokenRef.current, platform })
      } else {
        void setupPush()
      }
    }
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      unsubscribeAuth()
      window.removeEventListener('focus', onFocus)
      removeListeners?.()
    }
  }, [router])

  return null
}