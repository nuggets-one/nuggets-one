import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeCronOrAdmin } from '@/lib/cron/authorize'
import { drainNotifications, type DrainTarget } from '@/lib/notifications/drain'

const drainBodySchema = z.object({
  targets: z
    .array(z.enum(['fanout', 'push']))
    .min(1)
    .optional()
    .default(['fanout', 'push']),
})

/**
 * Manual drain for urgent fan-out / push delivery on Vercel Hobby (daily cron).
 * Auth: Bearer ${CRON_SECRET} or authenticated admin session.
 */
export async function POST(req: NextRequest) {
  if (!(await authorizeCronOrAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const parsed = drainBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  try {
    const result = await drainNotifications(parsed.data.targets as DrainTarget[])
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/notifications/drain] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
