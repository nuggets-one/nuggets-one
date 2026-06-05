import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronSecret } from '@/lib/cron/authorize'
import { drainPushOutbox } from '@/lib/notifications/push-outbox'

// Vercel Cron schedule: `vercel.json` — hourly (`0 * * * *`) is ideal on Pro for digest windows.
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await drainPushOutbox()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cron/push-outbox] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
