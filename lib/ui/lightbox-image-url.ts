import {
  canRenderWithNextImage,
  resolveCardImageUrl,
} from '@/lib/ui/card-image-host'
import { normalizeHeroThumbUrl } from '@/lib/ui/normalize-hero-thumb-url'

/** Resolved URL suitable for lightbox display and prefetch. */
export function resolveLightboxImageUrl(url: string): string | null {
  const normalized = normalizeHeroThumbUrl(url)
  if (!normalized) return null
  const resolved = resolveCardImageUrl(normalized)
  if (!resolved || !canRenderWithNextImage(resolved)) return null
  return resolved
}

/** Warm the browser cache for upcoming slides (best-effort). */
export function prefetchLightboxImages(urls: string[]): void {
  if (typeof window === 'undefined') return
  for (const raw of urls) {
    const src = resolveLightboxImageUrl(raw)
    if (!src) continue
    const img = new window.Image()
    img.decoding = 'async'
    img.src = src
  }
}
