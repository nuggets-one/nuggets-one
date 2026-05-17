const YT_ID = '([a-zA-Z0-9_-]{11})'

/** Extract a YouTube video id from common watch / live / short / embed URLs. */
export function extractYouTubeVideoId(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) return null
  const raw = url.trim()
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /[?&]v=([a-zA-Z0-9_-]{6,})/,
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
