/**
 * Parse `seconds` from a markdown timestamp link.
 * Supports fragment-only (`#yt=154`) and any URL whose hash contains `#yt=…`
 * (e.g. `/nuggets/id/slug#yt=154` if a pipeline absolutizes hrefs).
 */
export function parseYtHashSecondsFromHref(href: string | null | undefined): number | null {
  if (href == null || href === '') return null
  const m = href.match(/#yt=([^&#]+)/)
  if (!m) return null
  const raw = m[1].trim()

  // Canonical form: #yt=154
  if (/^\d+$/.test(raw)) {
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n) || n < 0) return null
    return n
  }

  // Legacy form found in some nuggets: #yt=MM:SS or #yt=HH:MM:SS
  // Examples:
  // - #yt=00:04:28 => 268
  // - #yt=05:20 => 320
  const parts = raw.split(':').map((p) => p.trim())
  if (parts.length !== 2 && parts.length !== 3) return null
  if (!parts.every((p) => /^\d+$/.test(p))) return null

  const nums = parts.map((p) => Number.parseInt(p, 10))
  const [a, b, c] = nums

  // HH:MM:SS
  if (parts.length === 3) {
    const [h, mm, ss] = [a, b, c]
    if (mm > 59 || ss > 59) return null
    return h * 3600 + mm * 60 + ss
  }

  // MM:SS
  const [mm, ss] = [a, b]
  if (mm > 59 || ss > 59) return null
  return mm * 60 + ss
}
