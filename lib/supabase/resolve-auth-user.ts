import type { AuthError, SupabaseClient, User } from '@supabase/supabase-js'

const STALE_REFRESH_CODES = new Set([
  'refresh_token_not_found',
  'session_not_found',
  'session_expired',
])

export function isStaleRefreshError(error: AuthError | null | undefined): boolean {
  if (!error) return false
  if (error.code && STALE_REFRESH_CODES.has(error.code)) return true
  const message = error.message ?? ''
  return message.includes('Invalid Refresh Token') || message.includes('Refresh Token Not Found')
}

type ResolveAuthUserOptions = {
  clearStaleSession?: boolean
}

export async function resolveAuthUser(
  supabase: SupabaseClient,
  options?: ResolveAuthUserOptions
): Promise<{ user: User | null }> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!error) {
    return { user }
  }

  if (!isStaleRefreshError(error)) {
    return { user: null }
  }

  if (options?.clearStaleSession) {
    await supabase.auth.signOut()
  }

  return { user: null }
}
