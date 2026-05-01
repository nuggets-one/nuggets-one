import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdmin = user?.app_metadata?.is_admin === true

  return NextResponse.json(
    {
      authenticated: !!user,
      email: user?.email ?? null,
      isAdmin,
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
