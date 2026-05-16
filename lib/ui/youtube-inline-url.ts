/**
 * Parse YouTube watch / short / embed URLs for in-app playback (feed mini-player).
 * Returns null when `href` is not a navigable YouTube URL with a resolvable video id.
 */

import { parseYtHashSecondsFromHref } from '@/lib/ui/youtube-timestamp-href'
import { extractYouTubeVideoId, isCanonicalYouTubeVideoId } from '@/lib/ui/youtube-video-id'

function isYouTubeHost(host: string): boolean {
  const h = host.toLowerCase()
  return h === 'youtu.be' || h.includes('youtube.com') || h.endsWith('youtube-nocookie.com')
}

/** Parse `t` / clock-style values YouTube uses in share URLs (e.g. `75`, `1m15s`, `1h2m3s`). */
function parseYoutubeTValue(raw: string): number | null {
  const v = raw.trim().toLowerCase()
  if (!v) return null
  if (/^\d+$/.test(v)) return Number.parseInt(v, 10)

  let sec = 0
  let any = false
  const h = /(\d+)\s*h/.exec(v)
  if (h) {
    sec += Number.parseInt(h[1], 10) * 3600
    any = true
  }
  const m = /(\d+)\s*m/.exec(v)
  if (m) {
    sec += Number.parseInt(m[1], 10) * 60
    any = true
  }
  const s = /(\d+)\s*s/.exec(v)
  if (s) {
    sec += Number.parseInt(s[1], 10)
    any = true
  }
  return any ? sec : null
}

/**
 * When `href` is a YouTube URL, returns video id + start offset in seconds.
 * `startSeconds` is 0 when no `t` / `start` parameter is present.
 */
export function parseYouTubeInlineNavigation(href: string | null | undefined): {
  videoId: string
  startSeconds: number
} | null {
  if (href == null || href.trim() === '') return null

  const trimmed = href.trim()
  const normalized = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed

  let url: URL
  try {
    url = new URL(normalized, 'https://www.youtube.com')
  } catch {
    return null
  }

  if (!isYouTubeHost(url.hostname)) return null

  const videoId = extractYouTubeVideoId(url.href)
  if (!videoId || !isCanonicalYouTubeVideoId(videoId)) return null

  let startSeconds = 0
  const startParam = url.searchParams.get('start')
  if (startParam && /^\d+$/.test(startParam)) {
    startSeconds = Number.parseInt(startParam, 10)
  } else {
    const tParam = url.searchParams.get('t')
    if (tParam) {
      const parsed = parseYoutubeTValue(tParam)
      if (parsed !== null) startSeconds = parsed
    }
  }

  return { videoId, startSeconds: Math.max(0, startSeconds) }
}

/**
 * For feed card preview: resolve click target into mini-player payload.
 * - `#yt=N` / `…#yt=N` → same-hero seek using `cardHeroVideoId`
 * - `youtube.com` / `youtu.be` links → parsed id + start (any video in mini-player)
 */
export function resolveCardPreviewYouTubeClick(
  href: string | null | undefined,
  cardHeroVideoId: string,
): { videoId: string; startSeconds: number } | null {
  const fromHash = parseYtHashSecondsFromHref(href)
  if (fromHash !== null) {
    return { videoId: cardHeroVideoId, startSeconds: fromHash }
  }
  return parseYouTubeInlineNavigation(href)
}

/**
 * For detail body: intercept only same-hero YouTube URLs or `#yt=` fragments.
 */
export function resolveDetailYouTubeTimestampClick(
  href: string | null | undefined,
  heroVideoId: string,
): number | null {
  const fromHash = parseYtHashSecondsFromHref(href)
  if (fromHash !== null) return fromHash

  const nav = parseYouTubeInlineNavigation(href)
  if (!nav || nav.videoId !== heroVideoId) return null
  return nav.startSeconds
}
