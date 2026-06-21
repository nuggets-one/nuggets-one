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
  tech_vc: 'nuggets-stream-tech-vc',
  geopolitics: 'nuggets-stream-geopolitics',
  leadership: 'nuggets-stream-leadership',
}

export function topicForStream(stream: PushStream): string {
  return PUSH_TOPIC_BY_STREAM[stream]
}

export type PushPreferences = {
  mute_all: boolean
  stream_standard: boolean
  stream_pulse: boolean
  stream_charts: boolean
  stream_tech_vc: boolean
  stream_geopolitics: boolean
  stream_leadership: boolean
}

export function topicsForPreferences(prefs: PushPreferences): string[] {
  if (prefs.mute_all) return []
  const topics: string[] = []
  if (prefs.stream_standard) topics.push(topicForStream('standard'))
  if (prefs.stream_pulse) topics.push(topicForStream('pulse'))
  if (prefs.stream_charts) topics.push(topicForStream('charts'))
  if (prefs.stream_tech_vc) topics.push(topicForStream('tech_vc'))
  if (prefs.stream_geopolitics) topics.push(topicForStream('geopolitics'))
  if (prefs.stream_leadership) topics.push(topicForStream('leadership'))
  return topics
}

export async function getPushPreferencesForUser(userId: string): Promise<PushPreferences> {
  const adminClient = getAdminClient()
  const { data, error } = await adminClient
    .from('notification_preferences')
    .select('mute_all, stream_standard, stream_pulse, stream_charts, stream_tech_vc, stream_geopolitics, stream_leadership')
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
    stream_tech_vc: data?.stream_tech_vc !== false,
    stream_geopolitics: data?.stream_geopolitics !== false,
    stream_leadership: data?.stream_leadership !== false,
  }
}
