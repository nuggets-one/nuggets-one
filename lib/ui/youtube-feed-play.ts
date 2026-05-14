/**
 * Feed mini-player: dispatch from thin card islands without React context
 * so the grid does not subscribe to playback state.
 */

export const YOUTUBE_FEED_PLAY_EVENT = 'youtube-feed-play'

export type YouTubeFeedPlayDetail = {
  videoId: string
  title: string
  startSeconds: number
  articleId?: string
}

export function dispatchYouTubeFeedPlay(detail: YouTubeFeedPlayDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<YouTubeFeedPlayDetail>(YOUTUBE_FEED_PLAY_EVENT, {
      detail: {
        videoId: detail.videoId.trim(),
        title: detail.title,
        startSeconds: Math.max(0, Math.floor(detail.startSeconds)),
        articleId: detail.articleId,
      },
    }),
  )
}
