'use client'

import Image from 'next/image'
import { CardMediaRaster } from '@/components/ui/card-media-raster'
import { CardSourceBadge } from '@/components/ui/card-source-badge'
import { GalleryImageTrigger } from '@/components/ui/gallery-image-trigger'
import {
  canRenderWithNextImage,
  resolveCardImageUrl,
  safeHostname,
  shouldOptimizeImage,
} from '@/lib/ui/card-image-host'
import {
  cardMediaGroupClasses,
  cardMediaImageClasses,
} from '@/lib/ui/card-media-hover'
import { normalizeHeroThumbUrl } from '@/lib/ui/normalize-hero-thumb-url'
import type { CardImage } from '@/types/article'

export type ThumbnailGridLightboxConfig = {
  articleId: string
  title: string
  detailHref: string
  heroThumbUrl: string | null
  allImages: CardImage[]
  sourceUrl?: string | null
  sourceHost?: string | null
}

type Props = {
  title: string
  images: CardImage[]
  totalCount: number
  sourceUrl?: string | null
  sourceHost?: string | null
  variant?: 'card' | 'detail'
  priority?: boolean
  imageSizes?: string
  /** When false, caller renders {@link CardSourceBadge} (e.g. outside a detail link). */
  showSourceBadge?: boolean
  /** Detail-only: tap a cell to open the global image lightbox. */
  lightbox?: ThumbnailGridLightboxConfig
}

/**
 * Shared 2 / 3 / 4-up thumbnail layouts (feed cards + nugget detail hero).
 * Replication spec §8 — PDFs are excluded upstream.
 */
export function ThumbnailGrid({
  title,
  images,
  totalCount,
  sourceUrl,
  sourceHost,
  variant = 'card',
  priority = false,
  imageSizes,
  showSourceBadge = true,
  lightbox,
}: Props) {
  if (images.length < 2) return null

  const cells = images.slice(0, 4)
  const overflow = Math.max(0, totalCount - 4)
  const layout = cells.length === 2 ? 'two' : cells.length === 3 ? 'three' : 'four'
  const showSource = showSourceBadge && Boolean(sourceUrl?.trim())
  const isDetail = variant === 'detail'
  const sizes =
    imageSizes ??
    (isDetail
      ? '(max-width: 768px) 50vw, 768px'
      : '(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px')

  return (
    <div
      className={
        isDetail
          ? 'relative aspect-video w-full overflow-hidden rounded-2xl bg-surface-raised'
          : 'absolute inset-0 h-full w-full min-h-0'
      }
    >
      {showSource && sourceUrl ? (
        <CardSourceBadge href={sourceUrl} label={sourceHost} />
      ) : null}
      <div className={gridClass(layout)}>
        {cells.map((img, idx) => {
          const isOverflowCell = layout === 'four' && idx === 3 && overflow > 0
          const cellClassName = `relative h-full min-h-[44px] overflow-hidden bg-surface-raised ${
            isDetail ? '' : cardMediaGroupClasses
          } ${cellClass(layout, idx)}`
          const cellInner = (
            <>
              <CellImage
                url={img.url}
                alt={img.alt ?? title}
                sizes={sizes}
                priority={priority && idx === 0}
                imageHover={!isDetail}
              />
              {isOverflowCell ? (
                <span
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/70 text-inverse"
                  aria-hidden="true"
                >
                  <GridMoreIcon />
                  <span className="text-base font-semibold leading-none">+{overflow}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wide opacity-90">
                    more
                  </span>
                </span>
              ) : null}
            </>
          )
          return lightbox ? (
            <GalleryImageTrigger
              key={`${img.url}-${idx}`}
              articleId={lightbox.articleId}
              title={lightbox.title}
              detailHref={lightbox.detailHref}
              clickedUrl={img.url}
              heroThumbUrl={lightbox.heroThumbUrl}
              allImages={lightbox.allImages}
              totalCount={totalCount}
              imageIndex={idx}
              sourceUrl={lightbox.sourceUrl}
              sourceHost={lightbox.sourceHost}
              className={cellClassName}
            >
              {cellInner}
            </GalleryImageTrigger>
          ) : (
            <div key={`${img.url}-${idx}`} className={cellClassName}>
              {cellInner}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GridMoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mb-0.5 opacity-90" aria-hidden>
      <rect x="2" y="2" width="7" height="7" rx="1" fill="currentColor" />
      <rect x="11" y="2" width="7" height="7" rx="1" fill="currentColor" />
      <rect x="2" y="11" width="7" height="7" rx="1" fill="currentColor" />
      <rect x="11" y="11" width="7" height="7" rx="1" fill="currentColor" opacity="0.45" />
    </svg>
  )
}

function CellImage({
  url,
  alt,
  sizes,
  priority,
  imageHover,
}: {
  url: string
  alt: string
  sizes: string
  priority: boolean
  imageHover: boolean
}) {
  const resolvedUrl = resolveCardImageUrl(normalizeHeroThumbUrl(url))
  if (!resolvedUrl || !canRenderWithNextImage(resolvedUrl)) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-surface-raised text-[10px] font-medium text-muted">
        Preview
      </div>
    )
  }
  if (resolvedUrl.includes('/image/fetch/')) {
    return (
      <CardMediaRaster
        src={resolvedUrl}
        alt={alt}
        priority={priority}
        imageHover={imageHover}
      />
    )
  }
  const host = safeHostname(resolvedUrl)
  return (
    <Image
      src={resolvedUrl}
      alt={alt}
      fill
      className={cardMediaImageClasses(imageHover)}
      sizes={sizes}
      quality={imageHover ? 75 : 80}
      priority={priority}
      unoptimized={!shouldOptimizeImage(host)}
    />
  )
}

function gridClass(layout: 'two' | 'three' | 'four'): string {
  if (layout === 'two') return 'grid h-full w-full grid-cols-2 gap-px'
  return 'grid h-full w-full grid-cols-2 grid-rows-2 gap-px'
}

function cellClass(layout: 'two' | 'three' | 'four', idx: number): string {
  if (layout === 'three' && idx === 0) return 'row-span-2'
  return ''
}
