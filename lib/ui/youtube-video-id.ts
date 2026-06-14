const YT_ID = '([a-zA-Z0-9_-]{11})'

function isYouTubeWatchHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, '')
  return h === 'youtube.com' || h === 'm.youtube.com' || h === 'youtu.be'
}

/** Extract a YouTube video id from common watch / live / short / embed URLs. */
export function extractYouTubeVideoId(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) return null
  const raw = url.trim()

  const shortMatch = raw.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/)
  if (shortMatch?.[1]) return shortMatch[1]

  try {
    const host = new URL(raw).hostname
    if (isYouTubeWatchHost(host)) {
      const vMatch = raw.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)
      if (vMatch?.[1]) return vMatch[1]
    }
  } catch {
    // fall through to host-agnostic patterns
  }

  const patterns = [
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    new RegExp(`youtube\\.com/live/${YT_ID}(?:[?&#/]|$)`),
    new RegExp(`youtube\\.com/shorts/${YT_ID}(?:[?&#/]|$)`),
    new RegExp(`i\\.ytimg\\.com/vi/${YT_ID}/`),
    new RegExp(`img\\.youtube\\.com/vi/${YT_ID}/`),
  ]
  for (const pattern of patterns) {
    const match = raw.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

/** Card components treat canonical YouTube ids as exactly 11 characters. */
export function isCanonicalYouTubeVideoId(id: string): boolean {
  return /^[\w-]{11}$/.test(id.trim())
}

/** True when `url` resolves to a canonical 11-char YouTube video id. */
export function isCanonicalYouTubeMediaUrl(url: string): boolean {
  const id = extractYouTubeVideoId(url)
  return Boolean(id && isCanonicalYouTubeVideoId(id))
}
