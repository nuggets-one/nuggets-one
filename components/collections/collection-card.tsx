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
  variant?: 'parent' | 'child'
  childPreviewTitles?: string[]
}

export function CollectionCard({
  collection,
  variant = 'child',
  childPreviewTitles = [],
}: Props) {
  const { id, title, description, curator_name, cover_url, entry_count, child_count } = collection
  const href = `/collections/${id}`
  const coverIsImage = cover_url ? isImageUrl(cover_url) : false
  const resolvedCoverUrl = coverIsImage ? resolveCardImageUrl(cover_url) : null
  const coverCanRender = resolvedCoverUrl ? canRenderWithNextImage(resolvedCoverUrl) : false
  const coverHost = resolvedCoverUrl ? safeHostname(resolvedCoverUrl) : ''
  const unoptimized = !shouldOptimizeImage(coverHost)

  const isParent = variant === 'parent'
  const titleClass = isParent
    ? 'text-lg font-semibold leading-snug text-primary transition-colors group-hover:text-primary/80'
    : 'text-base font-semibold leading-snug text-primary transition-colors group-hover:text-primary/80'

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-transform duration-150 hover:-translate-y-px hover:shadow-sm focus-within:ring-2 focus-within:ring-accent">
      <Link
        href={href}
        className={`relative block w-full overflow-hidden bg-surface-raised ${
          isParent ? 'aspect-[2.1/1]' : 'aspect-video'
        }`}
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

      <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
        <Link href={href} className="focus:outline-none">
          <h2 className={`${titleClass} line-clamp-2`}>
            {title}
          </h2>
        </Link>

        {description && (
          <p className={`leading-relaxed text-muted ${isParent ? 'line-clamp-2 text-sm' : 'line-clamp-1 text-sm'}`}>
            {description}
          </p>
        )}

        {isParent && childPreviewTitles.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {childPreviewTitles.slice(0, 3).map((label) => (
              <span
                key={label}
                className="inline-flex max-w-full items-center rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[11px] text-muted"
              >
                <span className="truncate">{label}</span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-border/70 pt-3 text-xs text-muted">
          <span className="truncate">Curated by {curator_name}</span>
          <span className="flex flex-wrap justify-end gap-x-2 gap-y-0.5 text-right">
            {child_count > 0 && (
              <span>
                {child_count} {child_count === 1 ? 'topic' : 'topics'}
              </span>
            )}
            {entry_count > 0 && (
              <span>
                {entry_count} {entry_count === 1 ? 'nugget' : 'nuggets'}
              </span>
            )}
          </span>
        </div>
      </div>
    </article>
  )
}
