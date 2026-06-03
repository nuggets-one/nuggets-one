import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isPushRegisterRateLimited } from '@/lib/push/rate-limit'
import { upsertPushDeviceToken } from '@/lib/push/register-token'

const registerSchema = z.object({
  install_id: z.string().uuid(),
  token: z.string().trim().min(1).max(4096),
  platform: z.literal('android'),
  app_version: z.string().trim().max(64).optional().nullable(),
  notifications_enabled: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
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

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rateKey = `${ip}:${parsed.data.install_id}`
  if (isPushRegisterRateLimited(rateKey)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    await upsertPushDeviceToken({
      installId: parsed.data.install_id,
      token: parsed.data.token,
      platform: parsed.data.platform,
      appVersion: parsed.data.app_version,
      notificationsEnabled: parsed.data.notifications_enabled,
      userId: user?.id ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[push/register]', message)
    return NextResponse.json({ error: 'Failed to register token' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, linked: !!user })
}
