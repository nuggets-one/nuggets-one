import 'server-only'

import { getSupabaseUrl } from '@/lib/supabase/config'

/**
 * Fire-and-forget ping to the Supabase push-topic-outbox Edge Function.
 * Promotes closed digest buffers and drains unsent topic rows without blocking publish.
 */
export function triggerPushTopicSender(): void {
  const supabaseUrl = getSupabaseUrl()
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!supabaseUrl || !cronSecret) return

  const url = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/push-topic-outbox`
  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cronSecret}`,
    },
    body: '{}',
  }).catch((err) => {
    console.warn('[triggerPushTopicSender] ping failed:', err)
  })
}
