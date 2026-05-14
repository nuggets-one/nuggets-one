/**
 * Shared YouTube nocookie embed URL + IFrame API postMessage helpers.
 * Used by `GlobalYouTubeMiniPlayer`, optional `YouTubePlayer`, and shared helpers.
 */

export const YOUTUBE_NOCOOKIE_ORIGIN = 'https://www.youtube-nocookie.com'

export type BuildYouTubeNoCookieEmbedSrcOptions = {
  autoplay?: boolean
  /** Seconds to start at (integer >= 0). Omitted from URL when 0 or null. */
  startSeconds?: number | null
  /**
   * Browser page origin improves IFrame API postMessage command delivery.
   * Pass `typeof window !== 'undefined' ? window.location.origin : null` from client code.
   */
  pageOrigin?: string | null
}

export function buildYouTubeNoCookieEmbedSrc(
  videoId: string,
  opts: BuildYouTubeNoCookieEmbedSrcOptions = {},
): string {
  const params = new URLSearchParams({ enablejsapi: '1', rel: '0' })
  if (opts.autoplay) params.set('autoplay', '1')
  const start = opts.startSeconds
  if (start != null && start > 0) {
    params.set('start', String(Math.max(0, Math.floor(start))))
  }
  const origin = opts.pageOrigin?.trim()
  if (origin) params.set('origin', origin)
  return `${YOUTUBE_NOCOOKIE_ORIGIN}/embed/${encodeURIComponent(videoId)}?${params.toString()}`
}

export function postYouTubeIframeCommand(
  contentWindow: Window,
  func: string,
  args: unknown[],
): void {
  contentWindow.postMessage(
    JSON.stringify({
      event: 'command',
      func,
      args,
    }),
    YOUTUBE_NOCOOKIE_ORIGIN,
  )
}
