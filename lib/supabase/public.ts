import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config'
import type { Database } from '@/lib/supabase/types'

let publicClient: ReturnType<typeof createClient<Database>> | null = null

export function getPublicClient() {
  if (!publicClient) {
    const url = getSupabaseUrl()
    const key = getSupabaseAnonKey()
    publicClient = createClient<Database>(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  return publicClient
}
