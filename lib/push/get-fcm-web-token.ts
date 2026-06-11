'use client'

import {
  getFirebaseVapidKey,
  getFirebaseWebConfig,
  isFirebaseWebPushConfigured,
} from '@/lib/push/firebase-web-config'

const SW_PATH = '/firebase-messaging-sw.js'

let messagingPromise: Promise<import('firebase/messaging').Messaging | null> | null = null
let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null

  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register(SW_PATH, { scope: '/' })
      .then((registration) => registration)
      .catch((err) => {
        console.warn('[web-push] service worker registration failed', err)
        swRegistrationPromise = null
        return null
      })
  }

  return swRegistrationPromise
}

async function getMessagingInstance(): Promise<import('firebase/messaging').Messaging | null> {
  if (!isFirebaseWebPushConfigured()) return null

  if (!messagingPromise) {
    messagingPromise = (async () => {
      const { isSupported, getMessaging } = await import('firebase/messaging')
      const { getApps, initializeApp } = await import('firebase/app')

      if (!(await isSupported())) return null

      const config = getFirebaseWebConfig()
      const app = getApps().length > 0 ? getApps()[0]! : initializeApp(config)
      return getMessaging(app)
    })().catch((err) => {
      console.warn('[web-push] messaging init failed', err)
      messagingPromise = null
      return null
    })
  }

  return messagingPromise
}

export async function getFcmWebToken(): Promise<string | null> {
  const registration = await getServiceWorkerRegistration()
  if (!registration) return null

  const messaging = await getMessagingInstance()
  if (!messaging) return null

  const vapidKey = getFirebaseVapidKey()
  if (!vapidKey) return null

  const { getToken } = await import('firebase/messaging')
  try {
    return await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
  } catch (err) {
    console.warn('[web-push] getToken failed', err)
    return null
  }
}

export async function deleteFcmWebToken(): Promise<void> {
  const messaging = await getMessagingInstance()
  if (!messaging) return

  const { deleteToken } = await import('firebase/messaging')
  try {
    await deleteToken(messaging)
  } catch (err) {
    console.warn('[web-push] deleteToken failed', err)
  }
}

export function isBrowserPushEnvironmentSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    isFirebaseWebPushConfigured()
  )
}

function resolveNotificationUrl(data: Record<string, unknown> | undefined): string {
  const articleId = data?.articleId ?? data?.article_id
  const slug = data?.slug
  if (typeof articleId === 'string' && typeof slug === 'string') {
    return `/nuggets/${articleId}/${slug}`
  }
  if (data?.stream === 'standard' || data?.stream === 'pulse') {
    return `/?stream=${data.stream}`
  }
  return '/'
}

/** FCM delivers to the page (not the SW) when the tab is focused — show a system notification. */
export function showForegroundWebPushNotification(
  payload: import('firebase/messaging').MessagePayload,
): void {
  if (Notification.permission !== 'granted') return

  const title = payload.notification?.title ?? payload.data?.title ?? 'Nuggets'
  const body = payload.notification?.body ?? payload.data?.body ?? ''
  const data = payload.data as Record<string, unknown> | undefined
  const targetUrl = resolveNotificationUrl(data)

  const notification = new Notification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag:
      typeof data?.articleId === 'string'
        ? `article:${data.articleId}`
        : undefined,
    data: { ...data, targetUrl },
  })

  notification.onclick = () => {
    notification.close()
    window.focus()
    window.location.assign(targetUrl)
  }
}

let foregroundUnsubscribe: (() => void) | null = null

/** Subscribe to FCM messages while the tab is in the foreground. Returns unsubscribe. */
export async function subscribeForegroundWebPushMessages(): Promise<(() => void) | null> {
  if (foregroundUnsubscribe) return foregroundUnsubscribe

  const messaging = await getMessagingInstance()
  if (!messaging) return null

  const { onMessage } = await import('firebase/messaging')
  foregroundUnsubscribe = onMessage(messaging, (payload) => {
    showForegroundWebPushNotification(payload)
  })
  return foregroundUnsubscribe
}
