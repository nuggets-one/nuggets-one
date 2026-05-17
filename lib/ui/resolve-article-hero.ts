import { resolveCardPreviewDisplayUrl } from '@/lib/ui/card-preview-display-url'
import { extractYouTubeVideoId, isCanonicalYouTubeVideoId } from '@/lib/ui/youtube-video-id'
import { youTubePosterHqUrl } from '@/lib/ui/excerpt-card'
import { isImageUrl } from '@/lib/ui/is-image-url'

export type ResolvedArticleHero = {
  hero_video_id: string | null
  hero_media_kind: 'youtube' | 'image' | null
  hero_thumb_url: string | null
  imageMediaUrls: string[]
}

export type CardCoverPreviewKind = 'youtube' | 'image' | 'none'

export type CardCoverPreview = {
  kind: CardCoverPreviewKind
  posterUrl: string | null
  videoId: string | null
  summary: string
}

/** Same URL splitting as admin `parseMediaUrls` — includes YouTube links. */
export function parseAdminMediaUrlList(value: string): string[] {
  const seen = new Set<string>()
  return value
    .split(/[\s,]+/)
    .map((url) => url.trim())
    .filter((url) => {
      if (!url || seen.has(url)) return false
      try {
        const parsed = new URL(url)
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          seen.add(url)
          return true
        }
      } catch {
        return false
      }
      return false
    })
}

/**
 * Derives hero_* fields and filters manual media URLs for admin save.
 * YouTube links in source_url or media_urls become `hero_media_kind: 'youtube'`.
 */
export function resolveArticleHeroFields(input: {
  source_url: string | null
  hero_thumb_url: string | null
  media_urls: string[]
}): ResolvedArticleHero {
  const imageMediaUrls: string[] = []
  let youtubeId: string | null = null

  for (const url of input.media_urls) {
    const fromUrl = extractYouTubeVideoId(url)
    if (fromUrl && isCanonicalYouTubeVideoId(fromUrl)) {
      youtubeId ??= fromUrl
      continue
    }
    imageMediaUrls.push(url)
  }

  const fromSource = extractYouTubeVideoId(input.source_url)
  if (fromSource && isCanonicalYouTubeVideoId(fromSource)) {
    youtubeId ??= fromSource
  }

  let heroThumb = input.hero_thumb_url?.trim() || null
  if (heroThumb) {
    const fromThumb = extractYouTubeVideoId(heroThumb)
    if (fromThumb && isCanonicalYouTubeVideoId(fromThumb)) {
      youtubeId ??= fromThumb
      heroThumb = null
    }
  }

  if (youtubeId) {
    const poster = youTubePosterHqUrl(youtubeId)
    const rasterThumb =
      heroThumb && isImageUrl(heroThumb) && !extractYouTubeVideoId(heroThumb) ? heroThumb : null
    return {
      hero_video_id: youtubeId,
      hero_media_kind: 'youtube',
      hero_thumb_url: rasterThumb ?? poster,
      imageMediaUrls,
    }
  }

  return {
    hero_video_id: null,
    hero_media_kind: imageMediaUrls.length > 0 || heroThumb ? 'image' : null,
    hero_thumb_url: heroThumb,
    imageMediaUrls,
  }
}

/** Human-readable feed card cover for admin preview (matches post-save behavior). */
export function describeCardCoverPreview(resolved: ResolvedArticleHero): CardCoverPreview {
  if (resolved.hero_media_kind === 'youtube' && resolved.hero_video_id) {
    const customImage =
      resolved.hero_thumb_url &&
      !resolved.hero_thumb_url.includes('i.ytimg.com/vi/') &&
      isImageUrl(resolved.hero_thumb_url)
    return {
      kind: 'youtube',
      posterUrl: resolveCardPreviewDisplayUrl(resolved.hero_thumb_url),
      videoId: resolved.hero_video_id,
      summary: customImage
        ? 'Feed card: your chosen image (YouTube still plays from Source URL).'
        : 'Feed card: YouTube poster from Source URL.',
    }
  }

  if (resolved.hero_media_kind === 'image' && resolved.hero_thumb_url) {
    return {
      kind: 'image',
      posterUrl: resolveCardPreviewDisplayUrl(resolved.hero_thumb_url),
      videoId: null,
      summary: 'Feed card: selected image cover.',
    }
  }

  return {
    kind: 'none',
    posterUrl: null,
    videoId: null,
    summary: 'Feed card will show “No preview” until you add a Source URL (YouTube) or card image.',
  }
}
