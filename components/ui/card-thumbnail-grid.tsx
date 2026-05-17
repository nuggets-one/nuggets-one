import { CardSourceBadge } from '@/components/ui/card-source-badge'
import { ThumbnailGrid } from '@/components/ui/thumbnail-grid'
import type { CardImage } from '@/types/article'

type Props = {
  articleId: string
  href: string
  title: string
  heroThumbUrl: string | null
  images: CardImage[]
  mediaImages: CardImage[]
  totalCount: number
  sourceUrl?: string | null
  sourceHost?: string | null
}

/** Feed card wrapper around shared {@link ThumbnailGrid}. */
export function CardThumbnailGrid({
  articleId,
  href,
  title,
  heroThumbUrl,
  images,
  mediaImages,
  totalCount,
  sourceUrl,
  sourceHost,
}: Props) {
  if (images.length < 2) return null

  const showSource = Boolean(sourceUrl?.trim())

  return (
    <div className="relative w-full overflow-hidden rounded-t-xl px-2 pb-2 pt-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
        {showSource && sourceUrl ? (
          <CardSourceBadge href={sourceUrl} label={sourceHost} />
        ) : null}
        <ThumbnailGrid
          title={title}
          images={images}
          totalCount={totalCount}
          variant="card"
          showSourceBadge={false}
          lightbox={{
            articleId,
            title,
            detailHref: href,
            heroThumbUrl,
            allImages: mediaImages,
            sourceUrl,
            sourceHost,
          }}
        />
      </div>
    </div>
  )
}
