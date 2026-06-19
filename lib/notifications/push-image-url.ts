import { cloudinaryFetchUrl, hasCloudinaryCloudName } from '@/lib/ui/cloudinary-fetch'
import { isImageUrl } from '@/lib/ui/is-image-url'
import { normalizeHeroThumbUrl } from '@/lib/ui/normalize-hero-thumb-url'

const PUSH_IMAGE_WIDTH = 512

/**
 * Normalize a hero/media URL for FCM rich notifications.
 * Proxies long-tail chart hosts through Cloudinary when configured so FCM can fetch the image.
 * Returns null when the URL is missing or not a renderable image — push still sends without image.
 */
export function resolvePushImageUrl(raw: string | null | undefined): string | null {
  const normalized = normalizeHeroThumbUrl(raw?.trim() || null)
  if (!normalized || !isImageUrl(normalized)) return null

  try {
    const parsed = new URL(normalized)
    if (parsed.protocol === 'http:') parsed.protocol = 'https:'
    if (parsed.protocol !== 'https:') return null

    const https = parsed.toString()
    const host = parsed.hostname.toLowerCase()

    if (host === 'res.cloudinary.com' && parsed.pathname.includes('/image/')) {
      return https
    }

    if (host === 'i.ytimg.com' || host.endsWith('.ytimg.com')) {
      return https
    }

    if (hasCloudinaryCloudName()) {
      return cloudinaryFetchUrl(https, { width: PUSH_IMAGE_WIDTH })
    }

    return https
  } catch {
    return null
  }
}
