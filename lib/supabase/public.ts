import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

let publicClient: ReturnType<typeof createClient<Database>> | null = null

export function getPublicClient() {
  if (!publicClient) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing Supabase public env vars')
    publicClient = createClient<Database>(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  return publicClient
}
