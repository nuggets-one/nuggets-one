import Image from 'next/image'
import Link from 'next/link'
import { CardMediaRaster } from '@/components/ui/card-media-raster'
import type { CollectionSummary } from '@/types/collection'
import {
  canRenderWithNextImage,
  resolveCardImageUrl,
  safeHostname,
  shouldOptimizeImage,
} from '@/lib/ui/card-image-host'
import { isImageUrl } from '@/lib/ui/is-image-url'

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
        background: `linear-gradient(135deg, hsl(${hue} var(--color-placeholder-saturation-start) var(--color-placeholder-lightness-start)) 0%, hsl(${(hue + 50) % 360} var(--color-placeholder-saturation-end) var(--color-placeholder-lightness-end)) 100%)`,
      }}
      aria-hidden="true"
    />
  )
}

type Props = {
  collection: CollectionSummary
}

export function CollectionCard({ collection }: Props) {
  const { id, title, description, curator_name, cover_url, entry_count } = collection
  const href = `/collections/${id}`
  const coverIsImage = cover_url ? isImageUrl(cover_url) : false
  const resolvedCoverUrl = coverIsImage ? resolveCardImageUrl(cover_url) : null
  const coverCanRender = resolvedCoverUrl ? canRenderWithNextImage(resolvedCoverUrl) : false
  const coverHost = resolvedCoverUrl ? safeHostname(resolvedCoverUrl) : ''
  const unoptimized = !shouldOptimizeImage(coverHost)

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition-transform duration-150 hover:-translate-y-px hover:shadow-sm focus-within:ring-2 focus-within:ring-accent">
      <Link
        href={href}
        className="relative block aspect-video w-full overflow-hidden bg-surface-raised"
        tabIndex={-1}
        aria-hidden="true"
      >
        {resolvedCoverUrl && coverCanRender ? (
          resolvedCoverUrl.includes('/image/fetch/') ? (
            <CardMediaRaster src={resolvedCoverUrl} alt={title} priority={false} />
          ) : (
            <Image
              src={resolvedCoverUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              quality={75}
              unoptimized={unoptimized}
            />
          )
        ) : (
          <GradientPlaceholder id={id} />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={href} className="focus:outline-none">
          <h2 className="text-base font-semibold leading-snug line-clamp-2 text-primary group-hover:text-primary/80 transition-colors">
            {title}
          </h2>
        </Link>

        {description && (
          <p className="text-sm leading-relaxed text-muted line-clamp-1">
            {description}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between text-xs text-muted">
          <span>Curated by {curator_name}</span>
          {entry_count > 0 && (
            <span>{entry_count} {entry_count === 1 ? 'nugget' : 'nuggets'}</span>
          )}
        </div>
      </div>
    </article>
  )
}
