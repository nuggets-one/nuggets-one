import type { Metadata } from 'next'
import { canRenderWithNextImage } from '@/lib/ui/card-image-host'
import {
  cloudinaryOgFetchUrl,
  hasCloudinaryCloudName,
} from '@/lib/ui/cloudinary-fetch'
import { normalizeHeroThumbUrl } from '@/lib/ui/normalize-hero-thumb-url'
import { getDefaultOgImageUrl, getSiteUrl } from '@/lib/seo/site-url'

const OG_WIDTH = 1200
const OG_HEIGHT = 630

function toAbsoluteHttps(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('/')) {
    return `${getSiteUrl()}${trimmed}`
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:'
    }
    if (parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Resolve hero_thumb_url for og:image — normalize YouTube posters, absolute HTTPS,
 * Cloudinary 1200×630 when configured, else allowlisted passthrough hosts.
 */
export function resolveOgImageUrl(heroThumbUrl: string | null | undefined): string {
  const fallback = getDefaultOgImageUrl()
  const normalized = normalizeHeroThumbUrl(heroThumbUrl)
  if (!normalized) return fallback

  const absolute = toAbsoluteHttps(normalized)
  if (!absolute) return fallback

  if (hasCloudinaryCloudName()) {
    return cloudinaryOgFetchUrl(absolute)
  }

  if (canRenderWithNextImage(absolute)) {
    return absolute
  }

  return fallback
}

export function buildOgImageMetadata(
  heroThumbUrl: string | null | undefined,
  alt: string
): NonNullable<Metadata['openGraph']>['images'] {
  const url = resolveOgImageUrl(heroThumbUrl)
  return [
    {
      url,
      width: OG_WIDTH,
      height: OG_HEIGHT,
      alt,
    },
  ]
}
