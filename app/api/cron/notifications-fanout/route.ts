import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { upsertNotifications } from '@/lib/notifications/fan-out'

/** Max failed drain attempts before marking row drained (remaining IDs abandoned — see logs). */
const MAX_DRAIN_ATTEMPTS = 15

// Vercel Cron schedule: `vercel.json` — Hobby allows at most once daily (`0 0 * * *`);
// Pro can use a tighter schedule. Auth: Bearer ${CRON_SECRET} only — no Supabase session.
// Never add this route to the proxy matcher.

// S7-F8: Vercel Cron issues GET — not POST. GET keeps the queue draining.
export async function GET(req: NextRequest) {
  const adminClient = getAdminClient()
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: pending, error: fetchError } = await adminClient
    .from('pending_fanout')
    .select('*')
    .is('drained_at', null)
    .order('created_at', { ascending: true })
    .limit(25)

  if (fetchError) {
    console.error('[cron/notifications-fanout] fetch error:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ drained: 0 })
  }

  let totalDrained = 0

  for (const row of pending) {
    const rowId = row.id as string
    const attempts = Number(row.drain_attempts ?? 0)

    try {
      await upsertNotifications({
        recipientIds: row.remaining_user_ids as string[],
        articleId: row.article_id as string,
        stream: row.stream as 'standard' | 'pulse',
        title: row.title as string,
      })

      await adminClient
        .from('pending_fanout')
        .update({ drained_at: new Date().toISOString() })
        .eq('id', rowId)

      totalDrained++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[cron/notifications-fanout] drain error for row', rowId, err)

      const nextAttempts = attempts + 1
      const abandoned = nextAttempts >= MAX_DRAIN_ATTEMPTS

      const { error: updateErr } = await adminClient
        .from('pending_fanout')
        .update({
          drain_attempts: nextAttempts,
          last_drain_error: message.slice(0, 2000),
          ...(abandoned ? { drained_at: new Date().toISOString() } : {}),
        })
        .eq('id', rowId)

      if (updateErr) {
        console.error('[cron/notifications-fanout] failed to record drain_attempts', rowId, updateErr)
      } else if (abandoned) {
        console.error(
          '[cron/notifications-fanout] abandoned pending_fanout row after max attempts:',
          rowId
        )
      }
    }
  }

  return NextResponse.json({ drained: totalDrained })
}
