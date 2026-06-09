import { youTubePosterHqUrl } from '@/lib/ui/excerpt-card'
import { isPdfUrl } from '@/lib/ui/is-pdf-url'
import { isGalleryImageUrl } from '@/lib/ui/gallery-image-url'
import { normalizeHeroThumbUrl } from '@/lib/ui/normalize-hero-thumb-url'
import { extractYouTubeVideoId, isCanonicalYouTubeVideoId } from '@/lib/ui/youtube-video-id'
import type { ArticleCardProps } from '@/types/article'

/** Resolves a single static thumb URL for skim rows (no grid, no iframe). */
export function resolveSkimRowThumbUrl(article: ArticleCardProps): string | null {
  const {
    hero_thumb_url,
    hero_media_kind,
    hero_video_id,
    source_url,
    images,
  } = article

  const trimmedHeroThumb = normalizeHeroThumbUrl(hero_thumb_url) ?? ''
  const rawVideoId = (() => {
    const stored = hero_video_id?.trim() ?? ''
    if (stored && isCanonicalYouTubeVideoId(stored)) return stored
    for (const candidate of [hero_thumb_url, source_url]) {
      const fromUrl = extractYouTubeVideoId(candidate)
      if (fromUrl && isCanonicalYouTubeVideoId(fromUrl)) return fromUrl
    }
    return stored
  })()
  const looksLikeYouTubeId = isCanonicalYouTubeVideoId(rawVideoId)
  const youtubePosterFallback =
    rawVideoId &&
    !trimmedHeroThumb &&
    looksLikeYouTubeId &&
    (hero_media_kind === 'youtube' || hero_media_kind === null || extractYouTubeVideoId(trimmedHeroThumb))
      ? youTubePosterHqUrl(rawVideoId)
      : null

  const singleGridImageFallback =
    !trimmedHeroThumb && !youtubePosterFallback && images.length === 1
      ? images[0].url.trim()
      : ''

  let thumb =
    trimmedHeroThumb ||
    youtubePosterFallback ||
    (singleGridImageFallback || null)

  if (thumb && isPdfUrl(thumb)) {
    const raster = images
      .map((i) => i.url.trim())
      .find((u) => u && isGalleryImageUrl(u))
    if (raster) thumb = raster
  }

  return thumb
}
