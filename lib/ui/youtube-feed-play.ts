/**
 * Feed mini-player: dispatch from thin card islands without React context
 * so the grid does not subscribe to playback state.
 */

export const YOUTUBE_FEED_PLAY_EVENT = 'youtube-feed-play'
export const YOUTUBE_FEED_CLOSE_EVENT = 'youtube-feed-close'
export const YOUTUBE_JUMP_FAB_VISIBILITY_EVENT = 'youtube-jump-fab-visibility'

export type YouTubeJumpFabVisibilityDetail = {
  visible: boolean
}

export type YouTubeFeedPlayDetail = {
  videoId: string
  title: string
  startSeconds: number
  articleId?: string
}

export type YouTubeFeedCloseDetail = {
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

export function dispatchYouTubeFeedClose(detail: YouTubeFeedCloseDetail = {}): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<YouTubeFeedCloseDetail>(YOUTUBE_FEED_CLOSE_EVENT, { detail }),
  )
}

export function dispatchYouTubeJumpFabVisibility(visible: boolean): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<YouTubeJumpFabVisibilityDetail>(YOUTUBE_JUMP_FAB_VISIBILITY_EVENT, {
      detail: { visible },
    }),
  )
}
