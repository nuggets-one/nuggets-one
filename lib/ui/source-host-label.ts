/**
 * Host label for a source URL (e.g. card byline). Pure helper, server-safe.
 */
export function getSourceHostLabel(
  url: string | null,
  options?: { truncateAt?: number }
): string | null {
  if (!url) return null
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const max = options?.truncateAt
    if (max != null && host.length > max) {
      return `${host.slice(0, max)}…`
    }
    return host
  } catch {
    return null
  }
}
