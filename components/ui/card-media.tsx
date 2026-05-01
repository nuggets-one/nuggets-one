import Image from 'next/image'
import Link from 'next/link'
import { CardSourceBadge } from '@/components/ui/card-source-badge'
import {
  canRenderWithNextImage,
  safeHostname,
  shouldOptimizeImage,
} from '@/lib/ui/card-image-host'

function idToHue(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash) % 360
}

function GradientPlaceholder({ id }: { id: string }) {
  const hue = idToHue(id)
  return (
    <div
      className="w-full h-full"
      style={{
        background: `linear-gradient(135deg, hsl(${hue},40%,85%) 0%, hsl(${(hue + 40) % 360},30%,75%) 100%)`,
      }}
      aria-hidden="true"
    />
  )
}

type Props = {
  href: string
  id: string
  title: string
  hero_thumb_url: string | null
  hero_alt_text: string | null
  ytMedia: boolean
  priority: boolean
  sourceHost: string | null
  source_url: string | null
}

export function CardMedia({
  href,
  id,
  title,
  hero_thumb_url,
  hero_alt_text,
  ytMedia,
  priority,
  sourceHost,
  source_url,
}: Props) {
  const canShow = canRenderWithNextImage(hero_thumb_url)
  const host = hero_thumb_url ? safeHostname(hero_thumb_url) : ''
  const optimized = shouldOptimizeImage(host)

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-surface-raised">
      <Link
        href={href}
        className="block h-full w-full"
        tabIndex={-1}
        aria-hidden="true"
      >
        {canShow && hero_thumb_url ? (
          <>
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
            {ytMedia && (
              <span
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors"
                aria-hidden="true"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/65 text-white shadow-lg ring-2 ring-white/80">
                  <svg className="ml-1 h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
            )}
          </>
        ) : (
          <GradientPlaceholder id={id} />
        )}
      </Link>
      {sourceHost && source_url && (
        <CardSourceBadge sourceHost={sourceHost} source_url={source_url} />
      )}
    </div>
  )
}
