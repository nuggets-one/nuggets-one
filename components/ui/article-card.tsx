import { CardMedia } from '@/components/ui/card-media'
import { CardBody } from '@/components/ui/card-body'
import { CardFooter } from '@/components/ui/card-footer'
import { CardThumbnailGrid } from '@/components/ui/card-thumbnail-grid'
import { formatTagDisplayLabel } from '@/lib/ui/tag-display-label'
import { youTubePosterHqUrl } from '@/lib/ui/excerpt-card'
import { isImageUrl } from '@/lib/ui/is-image-url'
import { isPdfUrl } from '@/lib/ui/is-pdf-url'
import type { ArticleCardProps } from '@/types/article'

function getSourceHostLabel(url: string | null): string | null {
  if (!url) return null
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host.length > 24 ? `${host.slice(0, 24)}…` : host
  } catch {
    return null
  }
}

type Props = {
  article: ArticleCardProps
  priority?: boolean
  isAuthenticated?: boolean
  initialBookmarked?: boolean
}

export function ArticleCard({
  article,
  priority = false,
  isAuthenticated = false,
  initialBookmarked = false,
}: Props) {
  const {
    id,
    slug,
    title,
    cardPreviewHtml,
    published_at,
    hero_thumb_url,
    hero_alt_text,
    hero_media_kind,
    hero_video_id,
    tag_slugs,
    tag_labels,
    source_url,
    images,
  } = article

  const href = `/nuggets/${id}/${slug}`
  const displayTags = tag_slugs
    .map((slug, index) => ({
      slug,
      label: tag_labels[index] ?? formatTagDisplayLabel(slug),
    }))
    .filter((tag) => tag.slug !== 'nuggets' && tag.slug !== 'pulse')
  const sourceHost = getSourceHostLabel(source_url)

  const trimmedHeroThumb = hero_thumb_url?.trim() ?? ''
  const rawVideoId = hero_video_id?.trim() ?? ''
  const looksLikeYouTubeId = /^[\w-]{11}$/.test(rawVideoId)
  // Legacy parity: poster when YouTube (or unknown kind with a plausible 11-char id).
  const youtubePosterFallback =
    rawVideoId &&
    !trimmedHeroThumb &&
    looksLikeYouTubeId &&
    (hero_media_kind === 'youtube' || hero_media_kind === null)
      ? youTubePosterHqUrl(rawVideoId)
      : null
  // Match legacy CardMedia / getThumbnailUrl: single grid image backs the hero
  // when hero_thumb_url is empty (multi-grid still requires length >= 2).
  const singleGridImageFallback =
    !trimmedHeroThumb && !youtubePosterFallback && images.length === 1
      ? images[0].url.trim()
      : ''
  let heroThumbForCard =
    trimmedHeroThumb ||
    youtubePosterFallback ||
    (singleGridImageFallback || null)
  // PDF heroes often fail in-browser (Cloudinary PDF restrictions / remote 403).
  // Prefer first non-PDF raster from article_media when available (legacy grid merge).
  if (heroThumbForCard && isPdfUrl(heroThumbForCard)) {
    const raster = images
      .map((i) => i.url.trim())
      .find((u) => u && !isPdfUrl(u) && isImageUrl(u))
    if (raster) heroThumbForCard = raster
  }
  const useThumbnailGrid = images.length >= 2

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-shadow duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-accent"
      data-article-id={id}
    >
      {useThumbnailGrid ? (
        <CardThumbnailGrid
          href={href}
          title={hero_alt_text ?? title}
          images={images}
          totalCount={images.length}
        />
      ) : (
        <CardMedia
          href={href}
          title={title}
          hero_thumb_url={heroThumbForCard}
          hero_alt_text={hero_alt_text}
          priority={priority}
        />
      )}

      <CardBody
        href={href}
        title={title}
        cardPreviewHtml={cardPreviewHtml}
        contentStream={article.content_stream}
        displayTags={displayTags}
      />

      <CardFooter
        href={href}
        title={title}
        published_at={published_at}
        sourceHost={sourceHost}
        source_url={source_url}
        articleId={id}
        isAuthenticated={isAuthenticated}
        initialBookmarked={initialBookmarked}
      />
    </article>
  )
}
