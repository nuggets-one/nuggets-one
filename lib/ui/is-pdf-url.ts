/** True when URL path (ignoring query) ends in .pdf — case-insensitive. */
export function isPdfUrl(url: string | null | undefined): boolean {
  if (typeof url !== 'string' || !url.trim()) return false
  try {
    const path = new URL(url).pathname.toLowerCase()
    return path.endsWith('.pdf')
  } catch {
    return false
  }
}
