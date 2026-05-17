import type { CardImage } from '@/types/article'
import { isGalleryImageUrl } from '@/lib/ui/gallery-image-url'

function normalizeUrlKey(url: string): string {
  return url.trim()
}

/**
 * Full gallery list for the image lightbox (hero + article_media, PDFs excluded).
 * Same merge/dedupe rules as {@link buildCardGalleryImages} without the 4-cell cap.
 */
export function buildLightboxImages(
  heroThumbUrl: string | null | undefined,
  mediaImages: CardImage[],
): CardImage[] {
  const hero = heroThumbUrl?.trim() ?? ''
  const heroEligible = isGalleryImageUrl(hero)

  const seen = new Set<string>()
  const images: CardImage[] = []

  const push = (url: string, alt: string | null) => {
    const key = normalizeUrlKey(url)
    if (!key || seen.has(key) || !isGalleryImageUrl(key)) return
    seen.add(key)
    images.push({ url: key, alt })
  }

  if (heroEligible) {
    push(hero, null)
  }

  for (const img of mediaImages) {
    push(img.url, img.alt)
  }

  return images
}

/** Map a grid/lightbox click URL to its index in the full list (falls back to 0). */
export function indexOfLightboxImage(images: CardImage[], clickedUrl: string): number {
  const key = normalizeUrlKey(clickedUrl)
  if (!key) return 0
  const idx = images.findIndex((img) => normalizeUrlKey(img.url) === key)
  return idx >= 0 ? idx : 0
}
