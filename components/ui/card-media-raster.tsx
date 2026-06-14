'use client'

import { useCallback, useState } from 'react'
import {
  cardMediaContainImageClasses,
  cardMediaCoverImageClasses,
} from '@/lib/ui/card-media-hover'

type Props = {
  src: string
  alt: string
  priority: boolean
  /** When true, image scales slightly on `group/media` hover (see `card-media-hover`). */
  imageHover?: boolean
  fit?: 'cover' | 'contain'
}

function externalPassthroughReferrerPolicy(src: string): 'no-referrer' | undefined {
  try {
    const host = new URL(src).hostname.toLowerCase()
    if (host === 'res.cloudinary.com' || host === 'i.ytimg.com') return undefined
    return 'no-referrer'
  } catch {
    return 'no-referrer'
  }
}

/**
 * Plain raster for proxied Cloudinary `image/fetch` URLs — mirrors the legacy
 * Vite feed’s native `<img>` path (no `next/image` + custom loader edge cases).
 * `onError` maps failed loads to the same “No preview” affordance as empty hero.
 */
export function CardMediaRaster({
  src,
  alt,
  priority,
  imageHover = false,
  fit = 'cover',
}: Props) {
  const [failed, setFailed] = useState(false)
  const onError = useCallback(() => {
    setFailed(true)
  }, [])

  if (failed) {
    return (
      <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-slate-100 text-xs font-medium text-muted dark:bg-slate-800">
        No preview
      </div>
    )
  }

  const imageClass =
    fit === 'contain'
      ? cardMediaContainImageClasses(imageHover)
      : cardMediaCoverImageClasses(imageHover)
  const referrerPolicy = externalPassthroughReferrerPolicy(src)

  if (fit === 'contain') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={imageClass}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy={referrerPolicy}
          {...(priority ? { fetchPriority: 'high' as const } : {})}
          onError={onError}
        />
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
        className={`absolute inset-0 h-full w-full ${imageClass}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy={referrerPolicy}
        {...(priority ? { fetchPriority: 'high' as const } : {})}
        onError={onError}
      />
    </>
  )
}
