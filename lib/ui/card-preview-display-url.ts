import { canRenderWithNextImage, resolveCardImageUrl } from '@/lib/ui/card-image-host'

/** Proxied URL safe for admin preview and feed cards (CSP + next/image allowlist). */
export function resolveCardPreviewDisplayUrl(url: string | null): string | null {
  const resolved = resolveCardImageUrl(url)
  return canRenderWithNextImage(resolved) ? resolved : null
}
