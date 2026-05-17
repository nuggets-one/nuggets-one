import { isPassthroughImageHost } from '../../lib/ui/image-host-policy'
import { isPdfUrl } from '../../lib/ui/is-pdf-url'
import { normalizeHeroThumbUrl } from '../../lib/ui/normalize-hero-thumb-url'

export type HeroUploadSkipReason =
  | 'empty'
  | 'pdf'
  | 'cloudinary'
  | 'youtube_poster'
  | 'passthrough_ok'

export function classifyHeroForCloudinaryUpload(hero_thumb_url: string | null): {
  normalized: string | null
  needsUpload: boolean
  skipReason: HeroUploadSkipReason | null
} {
  const normalized = normalizeHeroThumbUrl(hero_thumb_url)
  if (!normalized) {
    return { normalized: null, needsUpload: false, skipReason: 'empty' }
  }
  if (isPdfUrl(normalized)) {
    return { normalized, needsUpload: false, skipReason: 'pdf' }
  }

  let host = ''
  try {
    host = new URL(normalized).hostname.toLowerCase()
  } catch {
    return { normalized, needsUpload: false, skipReason: 'empty' }
  }

  if (host === 'res.cloudinary.com') {
    return { normalized, needsUpload: false, skipReason: 'cloudinary' }
  }
  if (host === 'i.ytimg.com') {
    return { normalized, needsUpload: false, skipReason: 'youtube_poster' }
  }

  return {
    normalized,
    needsUpload: true,
    skipReason: null,
  }
}

/** Skip upload when passthrough host responds OK to HEAD (saves API quota). */
export async function shouldSkipUploadForPassthrough(
  normalizedUrl: string
): Promise<boolean> {
  let host = ''
  try {
    host = new URL(normalizedUrl).hostname.toLowerCase()
  } catch {
    return true
  }

  if (!isPassthroughImageHost(host)) return false

  try {
    const response = await fetch(normalizedUrl, {
      method: 'HEAD',
      redirect: 'follow',
    })
    return response.ok
  } catch {
    return false
  }
}
