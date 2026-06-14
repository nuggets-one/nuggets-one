import type { CardImage } from '@/types/article'
import { resolveCardImageUrl } from '@/lib/ui/card-image-host'
import { isGalleryImageUrl } from '@/lib/ui/gallery-image-url'

function normalizeUrlKey(url: string): string {
  return url.trim()
}

/** Hero URL for the lightbox — accepts Cloudinary-resolved proxies used on cards. */
function resolveHeroGalleryUrl(heroThumbUrl: string | null | undefined): string | null {
  const hero = heroThumbUrl?.trim() ?? ''
  if (!hero) return null
  if (isGalleryImageUrl(hero)) return hero

  const resolved = resolveCardImageUrl(hero)
  if (resolved && isGalleryImageUrl(resolved)) return resolved

  return null
}

/**
 * Full gallery list for the image lightbox (hero + article_media, PDFs excluded).
 * Same merge/dedupe rules as {@link buildCardGalleryImages} without the 4-cell cap.
 */
export function buildLightboxImages(
  heroThumbUrl: string | null | undefined,
  mediaImages: CardImage[],
): CardImage[] {
  const heroUrl = resolveHeroGalleryUrl(heroThumbUrl)

  const seen = new Set<string>()
  const images: CardImage[] = []

  const push = (url: string, alt: string | null) => {
    const key = normalizeUrlKey(url)
    if (!key || seen.has(key) || !isGalleryImageUrl(key)) return
    seen.add(key)
    images.push({ url: key, alt })
  }

  if (heroUrl) {
    push(heroUrl, null)
  }

  for (const img of mediaImages) {
    const mediaUrl = resolveHeroGalleryUrl(img.url) ?? img.url
    push(mediaUrl, img.alt)
  }

  return images
}

/** Map a grid/lightbox click URL to its index in the full list (falls back to 0). */
export function indexOfLightboxImage(images: CardImage[], clickedUrl: string): number {
  const key = normalizeUrlKey(clickedUrl)
  if (!key) return 0

  const resolvedKey = normalizeUrlKey(resolveCardImageUrl(key) ?? '')
  const idx = images.findIndex((img) => {
    const imgKey = normalizeUrlKey(img.url)
    return imgKey === key || (resolvedKey.length > 0 && imgKey === resolvedKey)
  })
  return idx >= 0 ? idx : 0
}
