/**
 * Two-letter footer chip for a curator display name (feed / bookmarks / collections).
 * ASCII-only tokenization matches the old source-chip style for single-word names.
 */
export function curatorChipFromDisplayName(name: string | null | undefined): string {
  const raw = name?.trim()
  if (!raw) return 'N'

  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const first = parts[0].replace(/[^a-z0-9]/gi, '')
    const last = parts[parts.length - 1].replace(/[^a-z0-9]/gi, '')
    const a = first.charAt(0)
    const b = last.charAt(0)
    if (a && b) return (a + b).toLocaleUpperCase()
    if (a) return (a + a).toLocaleUpperCase().slice(0, 2)
  }

  const token = parts[0].replace(/[^a-z0-9]/gi, '')
  if (!token) return 'N'
  return token.length === 1
    ? token.charAt(0).toLocaleUpperCase()
    : token.slice(0, 2).toLocaleUpperCase()
}
