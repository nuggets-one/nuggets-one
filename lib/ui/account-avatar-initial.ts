/**
 * Single-letter avatar for the account menu: first character of a human
 * display name when present, otherwise the first character of the email.
 */
export function accountAvatarLetter(
  displayName: string | null | undefined,
  email: string | null | undefined
): string {
  const name = displayName?.trim()
  if (name && name.length > 0) {
    return name.charAt(0).toLocaleUpperCase()
  }
  const e = email?.trim()
  if (e && e.length > 0) {
    return e.charAt(0).toLocaleUpperCase()
  }
  return 'U'
}
