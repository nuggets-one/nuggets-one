/**
 * Parse `seconds` from a markdown timestamp link.
 * Supports fragment-only (`#yt=154`) and any URL whose hash contains `#yt=…`
 * (e.g. `/nuggets/id/slug#yt=154` if a pipeline absolutizes hrefs).
 */
export function parseYtHashSecondsFromHref(href: string | null | undefined): number | null {
  if (href == null || href === '') return null
  const m = href.match(/#yt=(\d+)/)
  if (!m) return null
  const n = Number.parseInt(m[1], 10)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}
