'use client'

import type { AuthChangeEvent } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export type AuthChange = {
  event: AuthChangeEvent
  authenticated: boolean
}

type AuthChangeListener = (change: AuthChange) => void

// Single shared browser client so every subscriber (auth status provider, web
// + native push) rides one Supabase session/refresh loop instead of each
// polling `/api/auth/status` on its own timer.
let sharedClient: ReturnType<typeof createClient> | null = null

function getSharedClient(): ReturnType<typeof createClient> {
  if (!sharedClient) {
    sharedClient = createClient()
  }
  return sharedClient
}

/**
 * Subscribe to Supabase auth changes (login, logout, token refresh) via the
 * browser client's event stream. Supabase fires `INITIAL_SESSION` synchronously
 * on subscribe, so the callback runs once immediately with the current state —
 * this replaces the old 5s `/api/auth/status` polling entirely.
 *
 * Returns an unsubscribe function.
 */
export function subscribeAuthChanges(listener: AuthChangeListener): () => void {
  const supabase = getSharedClient()
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    listener({ event, authenticated: !!session?.user })
  })
  return () => {
    data.subscription.unsubscribe()
  }
}
