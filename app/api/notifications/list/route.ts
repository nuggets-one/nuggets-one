import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { notifications: [], unreadCount: 0, preferences: null },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  }

  const [notificationsResult, unreadResult, prefsResult] = await Promise.all([
    supabase
      .from('user_notifications')
      .select(
        'id, article_id, kind, content_stream, title, ' +
        'is_read, read_at, created_at, batch_key, ' +
        'article:articles(slug)'
      )
      .order('created_at', { ascending: false })
      .limit(15),

    supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false),

    supabase
      .from('notification_preferences')
      .select('mute_all, stream_standard, stream_pulse')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const preferences = prefsResult.data ?? {
    mute_all: false,
    stream_standard: true,
    stream_pulse: true,
  }

  return NextResponse.json(
    {
      notifications: notificationsResult.data ?? [],
      unreadCount: unreadResult.count ?? 0,
      preferences,
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
