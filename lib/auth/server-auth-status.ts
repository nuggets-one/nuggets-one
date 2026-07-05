import 'server-only'

import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { resolveAuthUser } from '@/lib/supabase/resolve-auth-user'
import { resolveAvatarDisplayName } from '@/lib/ui/resolve-display-name'

export type ServerAuthStatus =
  | { authenticated: false; email: null; displayName: null; isAdmin: false }
  | {
      authenticated: true
      email: string | null
      displayName: string | null
      isAdmin: boolean
    }

/**
 * Resolve the current request's authenticated user once. `cache()` dedupes this
 * across the whole RSC render (layout + page + status resolver all share a
 * single `getUser()` call per request).
 */
export const getRequestUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const { user } = await resolveAuthUser(supabase, { clearStaleSession: true })
  return user
})

/**
 * Full auth status (email, display name, admin flag) for the header/account UI.
 * Backs both the `/api/auth/status` route and server-side hydration of
 * `AuthStatusProvider`, so the client no longer needs a mount-time fetch.
 */
export const getServerAuthStatus = cache(async (): Promise<ServerAuthStatus> => {
  const user = await getRequestUser()
  if (!user) {
    return { authenticated: false, email: null, displayName: null, isAdmin: false }
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()

  const raw = profile?.display_name
  const profileDisplayName =
    typeof raw === 'string' && raw.trim() ? raw.trim() : null

  const displayName = resolveAvatarDisplayName(
    profileDisplayName,
    user.user_metadata as Record<string, unknown> | undefined
  )

  return {
    authenticated: true,
    email: user.email ?? null,
    displayName,
    isAdmin: user.app_metadata?.is_admin === true,
  }
})
