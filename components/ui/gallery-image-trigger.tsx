'use client'

import type { ReactNode } from 'react'
import type { CardImage } from '@/types/article'
import { buildLightboxImages } from '@/lib/ui/build-lightbox-images'
import { dispatchImageGalleryOpen } from '@/lib/ui/image-gallery-open'

type Props = {
  articleId: string
  title: string
  detailHref: string
  clickedUrl: string
  heroThumbUrl: string | null
  allImages: CardImage[]
  totalCount: number
  imageIndex: number
  sourceUrl?: string | null
  sourceHost?: string | null
  className?: string
  children: ReactNode
}

/** Opens the global image lightbox without navigating to the nugget route. */
export function GalleryImageTrigger({
  articleId,
  title,
  detailHref,
  clickedUrl,
  heroThumbUrl,
  allImages,
  totalCount,
  imageIndex,
  sourceUrl,
  sourceHost,
  className,
  children,
}: Props) {
  const label =
    totalCount > 1
      ? `View image ${imageIndex + 1} of ${totalCount} in fullscreen`
      : 'View image in fullscreen'

  return (
    <button
      type="button"
      className={
        className ??
        'relative block h-full w-full min-h-[44px] cursor-zoom-in overflow-hidden'
      }
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        const images = buildLightboxImages(heroThumbUrl, allImages)
        dispatchImageGalleryOpen({
          articleId,
          title,
          detailHref,
          clickedUrl,
          images,
          totalImageCount: totalCount,
          sourceUrl,
          sourceHost,
        })
      }}
    >
      {children}
    </button>
  )
}
