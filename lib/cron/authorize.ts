import 'server-only'

import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export function authorizeCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`)
}

/** Cron secret (operators) or authenticated admin (in-app trigger). */
export async function authorizeCronOrAdmin(req: NextRequest): Promise<boolean> {
  if (authorizeCronSecret(req)) return true

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.app_metadata?.is_admin === true
}
