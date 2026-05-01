import Image from 'next/image'
import Link from 'next/link'
import {
  canRenderWithNextImage,
  safeHostname,
  shouldOptimizeImage,
} from '@/lib/ui/card-image-host'
import type { CardImage } from '@/types/article'

type Props = {
  href: string
  title: string
  images: CardImage[]
  /** Total available image count — used to render the "+N" overlay when > 4. */
  totalCount?: number
}

/**
 * Multi-image card grid (Phase 14, §2.J / replication spec §8).
 *
 * Layouts (cells positioned via Tailwind grid-area utilities):
 *   - 2 images: 50/50 split.
 *   - 3 images: 1 large left + 2 stacked right.
 *   - 4+ images: 2x2 with `+N` overlay on cell 4.
 *
 * The single-image case is handled by `<CardMedia>` directly (preserves
 * existing aspect-video hero rendering); this component is only invoked
 * when `images.length >= 2`.
 *
 * Server Component. The whole grid is wrapped in one outer `<Link>` so
 * clicking any cell navigates to the article (matches single-hero behavior).
 */
export function CardThumbnailGrid({
  href,
  title,
  images,
  totalCount,
}: Props) {
  if (images.length < 2) return null

  const cells = images.slice(0, 4)
  const overflow = Math.max(0, (totalCount ?? cells.length) - 4)
  const layout = cells.length === 2 ? 'two' : cells.length === 3 ? 'three' : 'four'

  return (
    <Link
      href={href}
      className="relative block aspect-video w-full overflow-hidden bg-surface-raised"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className={gridClass(layout)}>
        {cells.map((img, idx) => {
          const isOverflowCell = layout === 'four' && idx === 3 && overflow > 0
          return (
            <div
              key={`${img.url}-${idx}`}
              className={`relative overflow-hidden bg-surface-raised ${cellClass(layout, idx)}`}
            >
              <CellImage url={img.url} alt={img.alt ?? title} />
              {isOverflowCell && (
                <span
                  className="absolute inset-0 flex items-center justify-center bg-black/55 text-base font-semibold text-white"
                  aria-hidden="true"
                >
                  +{overflow}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </Link>
  )
}

function CellImage({ url, alt }: { url: string; alt: string }) {
  if (!canRenderWithNextImage(url)) {
    // Host not in remotePatterns — Next/Image would error. Skip media instead
    // of crashing; outer container's bg-surface-raised remains visible.
    return null
  }
  const host = safeHostname(url)
  return (
    <Image
      src={url}
      alt={alt}
      fill
      className="object-cover"
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
      quality={75}
      unoptimized={!shouldOptimizeImage(host)}
    />
  )
}

// 1px gap mirrors the replication spec — keeps each cell visually distinct.
function gridClass(layout: 'two' | 'three' | 'four'): string {
  if (layout === 'two') return 'grid h-full w-full grid-cols-2 gap-px'
  if (layout === 'three') return 'grid h-full w-full grid-cols-2 grid-rows-2 gap-px'
  return 'grid h-full w-full grid-cols-2 grid-rows-2 gap-px'
}

function cellClass(layout: 'two' | 'three' | 'four', idx: number): string {
  if (layout === 'three' && idx === 0) return 'row-span-2'
  return ''
}
