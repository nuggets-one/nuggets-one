export type YouTubePlaySource = 'poster' | 'timestamp'

export type YouTubePlayPayload = {
  video_id: string
  seconds: number
  source: YouTubePlaySource
  article_id?: string
}

/**
 * Fire-and-forget playback telemetry (BLUEPRINT §6.3a).
 * Replace with a real analytics endpoint when available.
 */
export function trackYouTubePlay(payload: YouTubePlayPayload): void {
  if (typeof window === 'undefined') return
  console.log('[telemetry]', {
    event: 'youtube_play',
    video_id: payload.video_id,
    seconds: Math.max(0, Math.floor(payload.seconds)),
    source: payload.source,
    ...(payload.article_id ? { article_id: payload.article_id } : {}),
  })
}
