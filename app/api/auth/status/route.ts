import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAvatarDisplayName } from '@/lib/ui/resolve-display-name'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdmin = user?.app_metadata?.is_admin === true

  let profileDisplayName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()
    const raw = profile?.display_name
    profileDisplayName = typeof raw === 'string' && raw.trim() ? raw.trim() : null
  }

  const displayName = resolveAvatarDisplayName(
    profileDisplayName,
    user?.user_metadata as Record<string, unknown> | undefined
  )

  return NextResponse.json(
    {
      authenticated: !!user,
      email: user?.email ?? null,
      displayName,
      isAdmin,
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
