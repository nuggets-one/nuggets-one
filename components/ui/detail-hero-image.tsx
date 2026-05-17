'use client'

import Image from 'next/image'
import { CardMediaRaster } from '@/components/ui/card-media-raster'
import { GalleryImageTrigger } from '@/components/ui/gallery-image-trigger'
import type { CardImage } from '@/types/article'

type Props = {
  articleId: string
  title: string
  detailHref: string
  heroThumbUrl: string | null
  allImages: CardImage[]
  totalImageCount: number
  sourceUrl?: string | null
  sourceHost?: string | null
  imageUrl: string
  alt: string
  imageSizes: string
  priority?: boolean
  unoptimized?: boolean
  useFetchRaster: boolean
}

/** Single-hero detail image with lightbox on tap. */
export function DetailHeroImage({
  articleId,
  title,
  detailHref,
  heroThumbUrl,
  allImages,
  totalImageCount,
  sourceUrl,
  sourceHost,
  imageUrl,
  alt,
  imageSizes,
  priority = false,
  unoptimized = false,
  useFetchRaster,
}: Props) {
  const totalCount = Math.max(totalImageCount, 1)

  return (
    <GalleryImageTrigger
      articleId={articleId}
      title={title}
      detailHref={detailHref}
      clickedUrl={imageUrl}
      heroThumbUrl={heroThumbUrl}
      allImages={allImages}
      totalCount={totalCount}
      imageIndex={0}
      sourceUrl={sourceUrl}
      sourceHost={sourceHost}
      className="relative block aspect-video w-full cursor-zoom-in overflow-hidden rounded-2xl bg-surface-raised"
    >
      {useFetchRaster ? (
        <CardMediaRaster src={imageUrl} alt={alt} priority={priority} />
      ) : (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className={cardMediaImageClasses(false)}
          sizes={imageSizes}
          quality={80}
          priority={priority}
          unoptimized={unoptimized}
        />
      )}
    </GalleryImageTrigger>
  )
}
