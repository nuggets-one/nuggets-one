import 'server-only'

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin env vars')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

let cachedAdminClient: ReturnType<typeof createAdminClient> | null = null

// Lazily resolve service-role env vars at request/runtime, not module import time.
export function getAdminClient() {
  if (!cachedAdminClient) {
    cachedAdminClient = createAdminClient()
  }
  return cachedAdminClient
}
