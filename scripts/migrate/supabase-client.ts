// scripts/migrate/supabase-client.ts
// Standalone Supabase client for ETL — NOT lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'
import { config } from './config'

export const db = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { persistSession: false },
})
