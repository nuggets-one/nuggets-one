/**
 * Sheet inline-player bus for nugget detail YouTube hero playback.
 * Keeps timestamp-to-player wiring local to the sheet surface.
 */

export const YOUTUBE_INLINE_PLAY_EVENT = 'youtube-inline-play'

export type YouTubeInlinePlayDetail = {
  videoId: string
  title: string
  startSeconds: number
  articleId: string
}

export function dispatchYouTubeInlinePlay(detail: YouTubeInlinePlayDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<YouTubeInlinePlayDetail>(YOUTUBE_INLINE_PLAY_EVENT, {
      detail: {
        videoId: detail.videoId.trim(),
        title: detail.title,
        startSeconds: Math.max(0, Math.floor(detail.startSeconds)),
        articleId: detail.articleId,
      },
    }),
  )
}
