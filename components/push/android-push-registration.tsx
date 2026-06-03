'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { createClient } from '@/lib/supabase/client'

function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export function AndroidPushRegistration() {
  const router = useRouter()
  const tokenRef = useRef<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!isAndroidNative()) return

    const supabase = createClient()

    const unregisterToken = async (token: string) => {
      await fetch('/api/push/unregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && tokenRef.current) {
        void unregisterToken(tokenRef.current)
        tokenRef.current = null
        startedRef.current = false
      }

      if (event === 'SIGNED_IN' && session && !startedRef.current) {
        startedRef.current = true
        void setupPush()
      }
    })

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !startedRef.current) {
        startedRef.current = true
        void setupPush()
      }
    })

    let removeListeners: (() => void) | undefined

    async function setupPush() {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')

        const registerToken = async (token: string) => {
          tokenRef.current = token
          await fetch('/api/push/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, platform: 'android' }),
          })
        }

        const regHandle = await PushNotifications.addListener('registration', (token) => {
          void registerToken(token.value)
        })

        const errHandle = await PushNotifications.addListener('registrationError', (error) => {
          console.warn('[push] registration error', error)
        })

        const actionHandle = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => {
            const data = action.notification.data
            const articleId = data?.articleId ?? data?.article_id
            const slug = data?.slug
            if (typeof articleId === 'string' && typeof slug === 'string') {
              router.push(`/nuggets/${articleId}/${slug}`)
            }
          }
        )

        removeListeners = () => {
          void regHandle.remove()
          void errHandle.remove()
          void actionHandle.remove()
        }

        let perm = await PushNotifications.checkPermissions()
        if (perm.receive === 'prompt') {
          perm = await PushNotifications.requestPermissions()
        }
        if (perm.receive !== 'granted') return

        await PushNotifications.register()
      } catch (err) {
        console.warn('[push] setup failed', err)
        startedRef.current = false
      }
    }

    return () => {
      subscription.unsubscribe()
      removeListeners?.()
    }
  }, [router])

  return null
}
