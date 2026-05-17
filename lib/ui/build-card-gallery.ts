import type { CardImage } from '@/types/article'
import { isGalleryImageUrl } from '@/lib/ui/gallery-image-url'

export type CardGalleryResult = {
  /** Up to 4 cells for the grid (hero first when present). */
  displayImages: CardImage[]
  /** Total distinct gallery images (for "+N" on cell 4). */
  totalImageCount: number
}

function normalizeUrlKey(url: string): string {
  return url.trim()
}

/**
 * Merge `hero_thumb_url` with `article_media` images for feed cards.
 * Legacy grid: hero is cell 1 when set; supporting media fill remaining cells.
 */
export function buildCardGalleryImages(
  heroThumbUrl: string | null | undefined,
  mediaImages: CardImage[],
  mediaImageCount: number
): CardGalleryResult {
  const hero = heroThumbUrl?.trim() ?? ''
  const heroEligible = isGalleryImageUrl(hero)

  const seen = new Set<string>()
  const displayImages: CardImage[] = []

  const push = (url: string, alt: string | null) => {
    const key = normalizeUrlKey(url)
    if (!key || seen.has(key) || !isGalleryImageUrl(key)) return
    seen.add(key)
    displayImages.push({ url: key, alt })
  }

  if (heroEligible) {
    push(hero, null)
  }

  for (const img of mediaImages) {
    if (displayImages.length >= 4) break
    push(img.url, img.alt)
  }

  let totalImageCount = mediaImageCount
  if (heroEligible) {
    const heroInMedia = mediaImages.some(
      (img) => normalizeUrlKey(img.url) === normalizeUrlKey(hero)
    )
    if (!heroInMedia) totalImageCount += 1
  }

  totalImageCount = Math.max(totalImageCount, displayImages.length)

  return { displayImages, totalImageCount }
}
