import type { NextConfig } from 'next'
import { IMAGE_REMOTE_HOSTS } from './lib/ui/image-host-policy'
import { resolveFirebaseWebEnv } from './lib/push/firebase-env-resolve'

const firebaseWeb = resolveFirebaseWebEnv()

// S11-F1: security headers per BLUEPRINT §5.6 — required PMF.
const isProd = process.env.NODE_ENV === 'production'
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://va.vercel-scripts.com"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://va.vercel-scripts.com"

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Phase 14 Tier 1: external UGC hosts served via `unoptimized={true}`.
      // Phase 14.5 will collapse these back to res.cloudinary.com once the
      // image/fetch proxy ships. Keep this list in lockstep with
      // `lib/ui/image-host-policy.ts` IMAGE_REMOTE_HOSTS and `remotePatterns`.
      `img-src 'self' data: ${IMAGE_REMOTE_HOSTS.map((host) => `https://${host}`).join(' ')}`,
      "media-src 'self' https://res.cloudinary.com",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://vitals.vercel-insights.com https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://*.googleapis.com",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "worker-src 'self'",
    ].join('; '),
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: firebaseWeb.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseWeb.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseWeb.projectId,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseWeb.messagingSenderId,
    NEXT_PUBLIC_FIREBASE_APP_ID: firebaseWeb.appId,
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: firebaseWeb.vapidKey,
  },
  images: {
    loader: 'custom',
    loaderFile: './lib/cloudinary-loader.ts',
    remotePatterns: IMAGE_REMOTE_HOSTS.map((hostname) => ({ protocol: 'https' as const, hostname })),
    // Next 16 defaults to [75]; detail/cards use 80 for YouTube thumbs and hero images.
    qualities: [75, 80],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
