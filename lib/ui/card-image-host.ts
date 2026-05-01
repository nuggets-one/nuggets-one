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
 * Phase 14.5 will collapse these — every external image will route through
 * `res.cloudinary.com/image/fetch/...`, so `shouldOptimizeImage` becomes
 * always-true and the passthrough hosts can be dropped from `remotePatterns`.
 */

const OPTIMIZED_HOSTS = new Set<string>([
  'res.cloudinary.com',
  'i.ytimg.com',
])

// Tier-1 passthrough hosts. Mirror this list with `next.config.ts` remotePatterns
// AND the `img-src` directive in the same file's CSP — drift will break rendering.
const PASSTHROUGH_HOSTS = new Set<string>([
  'pbs.twimg.com',
  'i.redd.it',
  'preview.redd.it',
  'i.imgur.com',
  'media.licdn.com',
])

export function shouldOptimizeImage(host: string): boolean {
  return OPTIMIZED_HOSTS.has(host.toLowerCase())
}

export function canRenderWithNextImage(url: string | null): boolean {
  if (!url) return false

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const path = parsed.pathname.toLowerCase()

    if (path.endsWith('.pdf')) return false

    return OPTIMIZED_HOSTS.has(host) || PASSTHROUGH_HOSTS.has(host)
  } catch {
    return false
  }
}

/** Hostname of `url` (lowercased), or empty string when unparseable. */
export function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}
