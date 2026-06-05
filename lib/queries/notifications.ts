import { createClient } from '@/lib/supabase/server'
import 'server-only'

export type NotificationRow = {
  id: string
  article_id: string | null
  kind: 'single' | 'digest'
  content_stream: 'standard' | 'pulse' | null
  title: string | null
  body: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
  batch_key: string | null
}

export async function getMyNotifications(limit = 15): Promise<NotificationRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_notifications')
    .select(
      'id, article_id, kind, content_stream, title, body, ' +
      'is_read, read_at, created_at, batch_key'
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getMyNotifications: ${error.message}`)
  return (data ?? []) as unknown as NotificationRow[]
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient()
  // S3-F3: explicit user_id filter (defense-in-depth on top of RLS)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) return 0
  return count ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('user_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  // S3-F3: explicit user_id filter (defense-in-depth on top of RLS)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('user_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false)
}
