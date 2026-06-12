import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronSecret } from '@/lib/cron/authorize'
import { drainPendingFanout } from '@/lib/notifications/drain-fanout'
import { flushCompletedDigestBuffers } from '@/lib/notifications/push-digest'

// Vercel Cron schedule: `vercel.json` — Hobby allows at most once daily (`0 0 * * *`);
// Pro can use a tighter schedule. Auth: Bearer ${CRON_SECRET} only — no Supabase session.
// Never add this route to the proxy matcher.

// S7-F8: Vercel Cron issues GET — not POST. GET keeps the queue draining.
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const digestBuffersFlushed = await flushCompletedDigestBuffers()
    const result = await drainPendingFanout()
    return NextResponse.json({ ...result, digestBuffersFlushed })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cron/notifications-fanout] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
