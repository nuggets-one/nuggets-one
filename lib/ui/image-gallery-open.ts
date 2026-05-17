import type { CardImage } from '@/types/article'

/**
 * Detail / feed image lightbox: dispatch from thin triggers without React context.
 */

export const IMAGE_GALLERY_OPEN_EVENT = 'image-gallery-open'

export type ImageGalleryOpenDetail = {
  articleId: string
  title: string
  /** URL of the cell or hero the user clicked. */
  clickedUrl: string
  /**
   * Pre-resolved full gallery. When omitted or incomplete, the global host
   * fetches `/api/nuggets/[id]/gallery-images`.
   */
  images?: CardImage[]
  /** Canonical nugget URL for the footer link (defaults to `/nuggets/[id]`). */
  detailHref?: string
  /** Total gallery size — host fetches full list when `images` is shorter. */
  totalImageCount?: number
  sourceUrl?: string | null
  sourceHost?: string | null
}

export function dispatchImageGalleryOpen(detail: ImageGalleryOpenDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<ImageGalleryOpenDetail>(IMAGE_GALLERY_OPEN_EVENT, {
      detail: {
        articleId: detail.articleId.trim(),
        title: detail.title,
        clickedUrl: detail.clickedUrl.trim(),
        images: detail.images,
        detailHref: detail.detailHref?.trim(),
        totalImageCount: detail.totalImageCount,
        sourceUrl: detail.sourceUrl?.trim() || undefined,
        sourceHost: detail.sourceHost?.trim() || undefined,
      },
    }),
  )
}
