import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import type { ContentStream } from '@/types/article'

export type PushPlatform = 'android' | 'ios' | 'web'
export type PushStream = ContentStream
export type PushTopicKind = 'immediate' | 'digest'

export const PUSH_TOPIC_BY_STREAM: Record<PushStream, string> = {
  standard: 'nuggets-stream-standard',
  pulse: 'nuggets-stream-pulse',
  charts: 'nuggets-stream-charts',
}

export function topicForStream(stream: PushStream): string {
  return PUSH_TOPIC_BY_STREAM[stream]
}

export type PushPreferences = {
  mute_all: boolean
  stream_standard: boolean
  stream_pulse: boolean
  stream_charts: boolean
}

export function topicsForPreferences(prefs: PushPreferences): string[] {
  if (prefs.mute_all) return []
  const topics: string[] = []
  if (prefs.stream_standard) topics.push(topicForStream('standard'))
  if (prefs.stream_pulse) topics.push(topicForStream('pulse'))
  if (prefs.stream_charts) topics.push(topicForStream('charts'))
  return topics
}

export async function getPushPreferencesForUser(userId: string): Promise<PushPreferences> {
  const adminClient = getAdminClient()
  const { data, error } = await adminClient
    .from('notification_preferences')
    .select('mute_all, stream_standard, stream_pulse, stream_charts')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[push-topics] preference lookup failed:', error.message)
  }

  return {
    mute_all: data?.mute_all === true,
    stream_standard: data?.stream_standard !== false,
    stream_pulse: data?.stream_pulse !== false,
    stream_charts: data?.stream_charts !== false,
  }
}
