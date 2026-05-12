import Image from 'next/image'
import Link from 'next/link'
import {
  canRenderWithNextImage,
  safeHostname,
  shouldOptimizeImage,
} from '@/lib/ui/card-image-host'

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
  const canShow = canRenderWithNextImage(hero_thumb_url)
  const host = hero_thumb_url ? safeHostname(hero_thumb_url) : ''
  const optimized = shouldOptimizeImage(host)

  return (
    <div className="w-full rounded-t-xl px-2 pb-2 pt-2">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-bg">
        <Link
          href={href}
          className="block h-full w-full"
          tabIndex={-1}
          aria-hidden="true"
        >
          {canShow && hero_thumb_url ? (
            <Image
              src={hero_thumb_url}
              alt={hero_alt_text ?? title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) calc((100vw - 3rem) / 2), (max-width: 1536px) calc((100vw - 4rem) / 4), 320px"
              quality={75}
              priority={priority}
              unoptimized={!optimized}
            />
          ) : (
            <NoPreviewPlaceholder />
          )}
        </Link>
      </div>
    </div>
  )
}
