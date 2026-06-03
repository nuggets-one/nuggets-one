import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { detachPushDeviceToken } from '@/lib/push/register-token'

const detachSchema = z.object({
  install_id: z.string().uuid(),
  token: z.string().trim().min(1).max(4096),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = detachSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  try {
    await detachPushDeviceToken(parsed.data.install_id, parsed.data.token)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[push/detach]', message)
    return NextResponse.json({ error: 'Failed to detach token' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
