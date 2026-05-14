/**
 * Display name for header avatar: app profile wins, then Supabase Auth user_metadata.
 */

export function displayNameFromUserMetadata(
  meta: Record<string, unknown> | null | undefined
): string | null {
  if (!meta) return null
  for (const key of [
    'full_name',
    'name',
    'display_name',
    'preferred_username',
    'user_name',
    'username',
  ] as const) {
    const v = meta[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

export function resolveAvatarDisplayName(
  profileDisplayName: string | null | undefined,
  userMetadata: Record<string, unknown> | null | undefined
): string | null {
  const fromProfile = profileDisplayName?.trim()
  if (fromProfile) return fromProfile
  return displayNameFromUserMetadata(userMetadata)
}
