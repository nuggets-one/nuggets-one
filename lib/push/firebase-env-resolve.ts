/** Resolve Firebase web config from canonical or legacy Vercel env var names. */
function cleanFirebaseEnvValue(raw: string | undefined): string {
  let value = String(raw ?? '').trim()
  for (let i = 0; i < 8; i++) {
    value = value.replace(/,\s*$/, '').trim()
    const unwrapped = value.replace(/^\\?["']+|\\?["']+$/g, '').trim()
    if (unwrapped === value) break
    value = unwrapped
  }
  return value
}

export function resolveFirebaseWebEnv(): {
  apiKey: string
  authDomain: string
  projectId: string
  messagingSenderId: string
  appId: string
  vapidKey: string
} {
  return {
    apiKey:
      cleanFirebaseEnvValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY) ||
      cleanFirebaseEnvValue(process.env.apiKey) ||
      '',
    authDomain:
      cleanFirebaseEnvValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) ||
      cleanFirebaseEnvValue(process.env.authDomain) ||
      '',
    projectId:
      cleanFirebaseEnvValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) ||
      cleanFirebaseEnvValue(process.env.projectId) ||
      '',
    messagingSenderId:
      cleanFirebaseEnvValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) ||
      cleanFirebaseEnvValue(process.env.messagingSenderId) ||
      '',
    appId:
      cleanFirebaseEnvValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID) ||
      cleanFirebaseEnvValue(process.env.appId) ||
      '',
    vapidKey: cleanFirebaseEnvValue(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY),
  }
}

export function isFirebaseWebEnvReady(
  env: ReturnType<typeof resolveFirebaseWebEnv> = resolveFirebaseWebEnv()
): boolean {
  return Boolean(
    env.apiKey &&
      env.authDomain &&
      env.projectId &&
      env.messagingSenderId &&
      env.appId &&
      env.vapidKey
  )
}
