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
