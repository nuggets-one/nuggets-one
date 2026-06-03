import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const registerSchema = z.object({
  token: z.string().trim().min(1).max(4096),
  platform: z.literal('android'),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { token, platform } = parsed.data

  const { error } = await supabase.from('push_device_tokens').upsert(
    {
      user_id: user.id,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  )

  if (error) {
    console.error('[push/register] upsert error:', error.message)
    return NextResponse.json({ error: 'Failed to register token' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
