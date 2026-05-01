import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { upsertNotifications } from '@/lib/notifications/fan-out'

// Vercel Cron calls this every 60 seconds.
// Auth: Bearer ${CRON_SECRET} header only — no Supabase session.
// Never add this route to the middleware matcher.

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
    .limit(10)

  if (fetchError) {
    console.error('[cron/notifications-fanout] fetch error:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ drained: 0 })
  }

  let totalDrained = 0

  for (const row of pending) {
    try {
      await upsertNotifications({
        recipientIds: row.remaining_user_ids,
        articleId: row.article_id,
        stream: row.stream,
        title: row.title,
      })

      await adminClient
        .from('pending_fanout')
        .update({ drained_at: new Date().toISOString() })
        .eq('id', row.id)

      totalDrained++
    } catch (err) {
      console.error('[cron/notifications-fanout] drain error for row', row.id, err)
    }
  }

  return NextResponse.json({ drained: totalDrained })
}
