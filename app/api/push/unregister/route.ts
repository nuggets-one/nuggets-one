import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const unregisterSchema = z.object({
  token: z.string().trim().min(1).max(4096),
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

  const parsed = unregisterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_device_tokens')
    .delete()
    .eq('user_id', user.id)
    .eq('token', parsed.data.token)

  if (error) {
    console.error('[push/unregister] delete error:', error.message)
    return NextResponse.json({ error: 'Failed to unregister token' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
