import { isImageUrl } from '@/lib/ui/is-image-url'
import { isPdfUrl } from '@/lib/ui/is-pdf-url'

/** Card/detail gallery cells — raster images only; PDFs are skipped. */
export function isGalleryImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  return isImageUrl(url) && !isPdfUrl(url)
}
