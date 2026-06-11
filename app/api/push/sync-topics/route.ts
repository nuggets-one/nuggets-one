import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncPushTopicsForUser } from '@/lib/push/topic-sync'

/** Re-sync FCM topic membership for all of the signed-in user's device tokens. */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const syncedCount = await syncPushTopicsForUser(user.id)
    return NextResponse.json({ ok: true, synced_tokens: syncedCount })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[push/sync-topics]', message)
    return NextResponse.json({ error: 'Failed to sync topics' }, { status: 500 })
  }
}
