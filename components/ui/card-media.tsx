'use client'

import Image from 'next/image'
import { CardMediaRaster } from '@/components/ui/card-media-raster'
import { CardMediaCountBadge } from '@/components/ui/card-media-count-badge'
import {
  canRenderWithNextImage,
  resolveCardImageUrl,
  safeHostname,
  shouldOptimizeImage,
} from '@/lib/ui/card-image-host'
import { CardSourceBadge } from '@/components/ui/card-source-badge'
import { GalleryImageTrigger } from '@/components/ui/gallery-image-trigger'
import {
  cardMediaContainImageClasses,
  cardMediaGroupClasses,
} from '@/lib/ui/card-media-hover'
import type { CardImage } from '@/types/article'

function NoPreviewPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-medium text-muted dark:bg-slate-800">
      No preview
    </div>
  )
}

type Props = {
  articleId: string
  href: string
  title: string
  hero_thumb_url: string | null
  hero_alt_text: string | null
  mediaImages: CardImage[]
  imageCount: number
  priority: boolean
  sourceUrl?: string | null
  sourceHost?: string | null
}

export function CardMedia({
  articleId,
  href,
  title,
  hero_thumb_url,
  hero_alt_text,
  mediaImages,
  imageCount,
  priority,
  sourceUrl,
  sourceHost,
}: Props) {
  const showSource = Boolean(sourceUrl?.trim())
  const resolvedHeroUrl = resolveCardImageUrl(hero_thumb_url)
  const canShow = canRenderWithNextImage(resolvedHeroUrl)
  const useFetchRaster = Boolean(resolvedHeroUrl?.includes('/image/fetch/'))
  const totalCount = Math.max(imageCount, mediaImages.length, canShow ? 1 : 0)
  const extraCount = totalCount - 1

  return (
    <div className="w-full rounded-t-xl px-2 pb-2 pt-2">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
        {showSource && sourceUrl ? (
          <CardSourceBadge href={sourceUrl} label={sourceHost} />
        ) : null}
        {canShow && resolvedHeroUrl ? (
          <>
            <CardMediaCountBadge extraCount={extraCount} />
            <GalleryImageTrigger
              articleId={articleId}
              title={hero_alt_text ?? title}
              detailHref={href}
              clickedUrl={hero_thumb_url ?? resolvedHeroUrl}
              heroThumbUrl={hero_thumb_url}
              allImages={mediaImages}
              totalCount={totalCount}
              imageIndex={0}
              sourceUrl={sourceUrl}
              sourceHost={sourceHost}
              className={`flex h-full w-full min-h-0 items-center justify-center overflow-hidden ${cardMediaGroupClasses} cursor-zoom-in`}
            >
              {useFetchRaster ? (
                <CardMediaRaster
                  src={resolvedHeroUrl}
                  alt={hero_alt_text ?? title}
                  priority={priority}
                  imageHover
                  fit="contain"
                />
              ) : (
                <Image
                  src={resolvedHeroUrl}
                  alt={hero_alt_text ?? title}
                  width={640}
                  height={360}
                  className={cardMediaContainImageClasses(true)}
                  sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) calc((100vw - 3rem) / 2), (max-width: 1536px) calc((100vw - 4rem) / 4), 320px"
                  quality={75}
                  priority={priority}
                  loading={priority ? 'eager' : 'lazy'}
                  unoptimized={!shouldOptimizeImage(safeHostname(resolvedHeroUrl))}
                />
              )}
            </GalleryImageTrigger>
          </>
        ) : (
          <NoPreviewPlaceholder />
        )}
      </div>
    </div>
  )
}
