'use client'

import { useCallback, useState } from 'react'
import { cardMediaImageClasses } from '@/lib/ui/card-media-hover'

type Props = {
  src: string
  alt: string
  priority: boolean
  /** When true, image scales slightly on `group/media` hover (see `card-media-hover`). */
  imageHover?: boolean
}

/**
 * Plain raster for proxied Cloudinary `image/fetch` URLs — mirrors the legacy
 * Vite feed’s native `<img>` path (no `next/image` + custom loader edge cases).
 * `onError` maps failed loads to the same “No preview” affordance as empty hero.
 */
export function CardMediaRaster({ src, alt, priority, imageHover = false }: Props) {
  const [failed, setFailed] = useState(false)
  const onError = useCallback(() => {
    setFailed(true)
  }, [])

  if (failed) {
    return (
      <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-bg text-xs font-medium text-muted">
        No preview
      </div>
    )
  }

  return (
    <>
      {/* Native img: Cloudinary `image/fetch` URLs are long encoded paths; `next/image` + custom loader is brittle here. Matches legacy Vite card `<img>`. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 h-full w-full ${cardMediaImageClasses(imageHover)}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...(priority ? { fetchPriority: 'high' as const } : {})}
        onError={onError}
      />
    </>
  )
}
