export type FirebaseWebConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  messagingSenderId: string
  appId: string
}

/** Values inlined at build from next.config env (supports legacy Vercel var names). */
export function getFirebaseWebConfig(): FirebaseWebConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() ?? '',
  }
}

export function getFirebaseVapidKey(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim() ?? ''
}

export function isFirebaseWebConfigReady(config: FirebaseWebConfig = getFirebaseWebConfig()): boolean {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.messagingSenderId &&
      config.appId
  )
}

export function isFirebaseWebPushConfigured(): boolean {
  return isFirebaseWebConfigReady() && !!getFirebaseVapidKey()
}
