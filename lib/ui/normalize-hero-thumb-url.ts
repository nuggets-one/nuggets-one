import { youTubePosterHqUrl } from '@/lib/ui/excerpt-card'
import {
  extractYouTubeVideoId,
  isCanonicalYouTubeVideoId,
} from '@/lib/ui/youtube-video-id'

/**
 * Normalize legacy hero URLs so feed cards can render under the narrow img-src policy.
 * Migrated rows sometimes store youtube.com page URLs or img.youtube.com thumbs
 * instead of i.ytimg.com posters.
 */
export function normalizeHeroThumbUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim() ?? ''
  if (!trimmed) return null

  const videoId = extractYouTubeVideoId(trimmed)
  if (!videoId || !isCanonicalYouTubeVideoId(videoId)) return trimmed

  try {
    const host = new URL(trimmed).hostname.toLowerCase().replace(/^www\./, '')
    const isYouTubePage =
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtu.be' ||
      host === 'img.youtube.com'
    if (isYouTubePage) return youTubePosterHqUrl(videoId)
  } catch {
    return trimmed
  }

  return trimmed
}
