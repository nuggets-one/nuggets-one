import Image from 'next/image'
import Link from 'next/link'
import { CardMediaRaster } from '@/components/ui/card-media-raster'
import {
  canRenderWithNextImage,
  resolveCardImageUrl,
  safeHostname,
  shouldOptimizeImage,
} from '@/lib/ui/card-image-host'
import {
  cardMediaGroupClasses,
  cardMediaImageHoverClasses,
} from '@/lib/ui/card-media-hover'

function NoPreviewPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg text-xs font-medium text-muted">
      No preview
    </div>
  )
}

type Props = {
  href: string
  title: string
  hero_thumb_url: string | null
  hero_alt_text: string | null
  priority: boolean
}

export function CardMedia({
  href,
  title,
  hero_thumb_url,
  hero_alt_text,
  priority,
}: Props) {
  const resolvedHeroUrl = resolveCardImageUrl(hero_thumb_url)
  const canShow = canRenderWithNextImage(resolvedHeroUrl)
  const useFetchRaster = Boolean(resolvedHeroUrl?.includes('/image/fetch/'))

  return (
    <div className="w-full rounded-t-xl px-2 pb-2 pt-2">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-bg">
        <Link
          href={href}
          className={`relative block h-full w-full ${cardMediaGroupClasses}`}
          tabIndex={-1}
          aria-hidden="true"
        >
          {canShow && resolvedHeroUrl ? (
            useFetchRaster ? (
              <CardMediaRaster
                src={resolvedHeroUrl}
                alt={hero_alt_text ?? title}
                priority={priority}
                imageHover
              />
            ) : (
              <Image
                src={resolvedHeroUrl}
                alt={hero_alt_text ?? title}
                fill
                className={`object-cover ${cardMediaImageHoverClasses}`}
                sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) calc((100vw - 3rem) / 2), (max-width: 1536px) calc((100vw - 4rem) / 4), 320px"
                quality={75}
                priority={priority}
                unoptimized={!shouldOptimizeImage(safeHostname(resolvedHeroUrl))}
              />
            )
          ) : (
            <NoPreviewPlaceholder />
          )}
        </Link>
      </div>
    </div>
  )
}
