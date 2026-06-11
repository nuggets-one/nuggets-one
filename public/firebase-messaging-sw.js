/**
 * FCM background handler + notification click deep links for browser push.
 * Firebase compat SDK is self-hosted under /firebase/ (copied at build) to avoid CSP blocking gstatic.com.
 */
importScripts('/firebase-messaging-config.js')

try {
  importScripts('/firebase/firebase-app-compat.js')
  importScripts('/firebase/firebase-messaging-compat.js')

  const config = self.__FIREBASE_WEB_CONFIG__ ?? {}

  if (config.apiKey && config.projectId) {
    firebase.initializeApp(config)
    const messaging = firebase.messaging()

    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title ?? payload.data?.title ?? 'Nuggets'
      const body = payload.notification?.body ?? payload.data?.body ?? ''
      const data = payload.data ?? {}

      const options = {
        body,
        icon: payload.notification?.icon ?? 'https://nuggets.one/icons/icon-192.png',
        badge: 'https://nuggets.one/icons/badge-72.png',
        data,
        tag: data.articleId ? `article:${data.articleId}` : undefined,
      }

      return self.registration.showNotification(title, options)
    })
  }
} catch (err) {
  console.error('[firebase-messaging-sw] Firebase init failed:', err)
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data ?? {}
  const articleId = data.articleId ?? data.article_id
  const slug = data.slug

  let targetUrl = '/'
  if (typeof articleId === 'string' && typeof slug === 'string') {
    targetUrl = `/nuggets/${articleId}/${slug}`
  } else if (data.stream === 'standard' || data.stream === 'pulse') {
    targetUrl = `/?stream=${data.stream}`
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const absoluteUrl = new URL(targetUrl, self.location.origin).href

      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => self.clients.openWindow(absoluteUrl))
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl)
      }

      return undefined
    })
  )
})
