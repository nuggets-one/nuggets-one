/**
 * Card image host gating — Phase 14 (Tier 1).
 *
 * Two predicates over a URL's hostname:
 *
 *  - `canRenderWithNextImage(url)` — host is in `next.config.ts` `remotePatterns`,
 *    so `<Image>` is allowed to fetch it. False → render gradient placeholder.
 *
 *  - `shouldOptimizeImage(host)` — host is served via Cloudinary's image pipeline
 *    (or is YouTube's thumbnail CDN, which we treat as already-optimized).
 *    False → set `unoptimized={true}` on `<Image>` so Vercel's image optimizer
 *    is bypassed (preserves Hobby quota; layout stability still preserved).
 *
 * Passthrough hosts (Twitter, Contentful, …) use `unoptimized={true}` on cards.
 * Long-tail hosts still use Cloudinary `image/fetch` when `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set.
 */

import { cloudinaryFetchUrl } from '@/lib/ui/cloudinary-fetch'
import { IMAGE_REMOTE_HOSTS } from '@/lib/ui/image-host-policy'

const ALLOWED_IMAGE_HOSTS = new Set<string>(IMAGE_REMOTE_HOSTS)

export function shouldOptimizeImage(host: string): boolean {
  return ALLOWED_IMAGE_HOSTS.has(host.toLowerCase())
}

export function canRenderWithNextImage(url: string | null): boolean {
  if (!url) return false

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const path = parsed.pathname.toLowerCase()

    if (path.endsWith('.pdf') && host !== 'res.cloudinary.com') return false

    return ALLOWED_IMAGE_HOSTS.has(host)
  } catch {
    return false
  }
}

/**
 * Route non-allowlisted image URLs through Cloudinary fetch so they can
 * still render via Next/Image under a strict remote host policy.
 */
export function resolveCardImageUrl(url: string | null): string | null {
  if (!url) return null
  if (canRenderWithNextImage(url)) return url
  return cloudinaryFetchUrl(url)
}

/** Hostname of `url` (lowercased), or empty string when unparseable. */
export function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}
