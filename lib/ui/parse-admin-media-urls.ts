/**
 * Parses admin "Card images" textarea into HTTP(S) URLs.
 *
 * Naive comma-split breaks Cloudinary/Substack fetch URLs (`f_auto,q_auto,...`).
 * We extract `https://…` tokens (commas inside the path are kept) and only fall
 * back to whitespace/comma split when no URL pattern is found.
 */
export function parseAdminMediaUrlList(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return []

  const seen = new Set<string>()
  const urls: string[] = []

  function accept(candidate: string) {
    const url = candidate.replace(/[,\s;]+$/, '').trim()
    if (!url || seen.has(url)) return
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        seen.add(url)
        urls.push(url)
      }
    } catch {
      // skip invalid token
    }
  }

  const extracted = trimmed.match(/https?:\/\/[^\s]+/gi)
  if (extracted?.length) {
    for (const match of extracted) accept(match)
    return urls
  }

  for (const part of trimmed.split(/[\s,]+/)) {
    if (part) accept(part)
  }
  return urls
}
