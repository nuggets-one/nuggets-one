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
        'id, article_id, kind, content_stream, title, body, ' +
        'is_read, read_at, created_at, batch_key, ' +
        'article:articles(slug)'
      )
      .order('created_at', { ascending: false })
      .limit(15),

    // S3-F3: explicit user_id filter (defense-in-depth on top of RLS)
    supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),

    supabase
      .from('notification_preferences')
      .select('mute_all, stream_standard, stream_pulse, stream_charts, stream_tech_vc, stream_geopolitics, stream_leadership')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const preferences = prefsResult.data ?? {
    mute_all: false,
    stream_standard: true,
    stream_pulse: true,
    stream_charts: true,
    stream_tech_vc: true,
    stream_geopolitics: true,
    stream_leadership: true,
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
