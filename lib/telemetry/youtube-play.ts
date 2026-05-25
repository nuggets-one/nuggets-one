export type YouTubePlaySource = 'poster' | 'timestamp'
export type YouTubePlaybackMode = 'inline_hero' | 'mini_player'

export type YouTubePlayPayload = {
  video_id: string
  seconds: number
  source: YouTubePlaySource
  playback_mode?: YouTubePlaybackMode
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
    playback_mode: payload.playback_mode ?? 'mini_player',
    ...(payload.article_id ? { article_id: payload.article_id } : {}),
  })
}
