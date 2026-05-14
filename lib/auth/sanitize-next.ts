/**
 * PRODUCT §0.7: open-redirect guard — relative in-app paths only.
 * Shared by auth callback and server actions.
 */
export function sanitizeNext(
  raw: string | null | undefined | FormDataEntryValue
): string {
  const next = typeof raw === 'string' ? raw : ''
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/'
  try {
    if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(decodeURIComponent(next))) return '/'
  } catch {
    return '/'
  }
  return next
}
