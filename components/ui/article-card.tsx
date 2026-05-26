import { CardMedia } from '@/components/ui/card-media'
import { NuggetDetailLink } from '@/components/ui/nugget-detail-link'
import { CardBody } from '@/components/ui/card-body'
import { YouTubeFeedHero } from '@/components/ui/youtube-feed-hero'
import { CardFooter } from '@/components/ui/card-footer'
import { CardThumbnailGrid } from '@/components/ui/card-thumbnail-grid'
import { getSourceHostLabel } from '@/lib/ui/source-host-label'
import { youTubePosterHqUrl } from '@/lib/ui/excerpt-card'
import { extractYouTubeVideoId, isCanonicalYouTubeVideoId } from '@/lib/ui/youtube-video-id'
import { isGalleryImageUrl } from '@/lib/ui/gallery-image-url'
import { isPdfUrl } from '@/lib/ui/is-pdf-url'
import { normalizeHeroThumbUrl } from '@/lib/ui/normalize-hero-thumb-url'
import { buildCardGalleryImages } from '@/lib/ui/build-card-gallery'
import type { ArticleCardProps } from '@/types/article'

type Props = {
  article: ArticleCardProps
  priority?: boolean
  isAuthenticated?: boolean
  initialBookmarked?: boolean
  /** When set (admin session), 3-dot menu includes Edit nugget. */
  adminEditHref?: string | null
  /** Post-delete redirect when admin deletes from card overflow menu. */
  deleteRedirectTo?: string
}

export function ArticleCard({
  article,
  priority = false,
  isAuthenticated = false,
  initialBookmarked = false,
  adminEditHref = null,
  deleteRedirectTo = '/',
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
    image_count,
  } = article

  const href = `/nuggets/${id}/${slug}`
  const displayTags = tag_slugs
    .map((slug, index) => ({
      slug,
      label: tag_labels[index] ?? slug,
    }))
    .filter((tag) => tag.slug !== 'nuggets' && tag.slug !== 'pulse')
  const sourceHost = getSourceHostLabel(source_url, { truncateAt: 24 })

  const trimmedHeroThumb = normalizeHeroThumbUrl(hero_thumb_url) ?? ''
  const rawVideoId = (() => {
    const stored = hero_video_id?.trim() ?? ''
    if (stored && isCanonicalYouTubeVideoId(stored)) return stored
    for (const candidate of [hero_thumb_url, source_url]) {
      const fromUrl = extractYouTubeVideoId(candidate)
      if (fromUrl && isCanonicalYouTubeVideoId(fromUrl)) return fromUrl
    }
    return stored
  })()
  const looksLikeYouTubeId = isCanonicalYouTubeVideoId(rawVideoId)
  // Legacy parity: poster when YouTube (or unknown kind with a plausible 11-char id).
  const youtubePosterFallback =
    rawVideoId &&
    !trimmedHeroThumb &&
    looksLikeYouTubeId &&
    (hero_media_kind === 'youtube' || hero_media_kind === null || extractYouTubeVideoId(trimmedHeroThumb))
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
      .find((u) => u && isGalleryImageUrl(u))
    if (raster) heroThumbForCard = raster
  }
  const { displayImages, totalImageCount } = buildCardGalleryImages(
    heroThumbForCard,
    images,
    image_count
  )
  const useThumbnailGrid = displayImages.length >= 2

  const youtubeIdFromSource = extractYouTubeVideoId(source_url)
  const hasYouTubePlayback =
    Boolean(rawVideoId) &&
    looksLikeYouTubeId &&
    (hero_media_kind === 'youtube' ||
      hero_media_kind === null ||
      (hero_media_kind === 'image' && Boolean(youtubeIdFromSource)))
  const showYouTubeFeedHero = !useThumbnailGrid && hasYouTubePlayback
  const youtubePreview =
    rawVideoId && looksLikeYouTubeId && hasYouTubePlayback
      ? { videoId: rawVideoId, title, articleId: id }
      : undefined

  return (
    <article
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border-strong bg-surface transition-shadow duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-accent"
      data-article-id={id}
    >
      {useThumbnailGrid ? (
        <CardThumbnailGrid
          articleId={id}
          href={href}
          title={hero_alt_text ?? title}
          heroThumbUrl={heroThumbForCard}
          images={displayImages}
          mediaImages={images}
          totalCount={totalImageCount}
          sourceUrl={source_url}
          sourceHost={sourceHost}
        />
      ) : showYouTubeFeedHero ? (
        <YouTubeFeedHero
          title={title}
          hero_thumb_url={heroThumbForCard}
          hero_alt_text={hero_alt_text}
          priority={priority}
          videoId={rawVideoId}
          articleId={id}
          sourceUrl={source_url}
          sourceHost={sourceHost}
        />
      ) : (
        <CardMedia
          articleId={id}
          href={href}
          title={title}
          hero_thumb_url={heroThumbForCard}
          hero_alt_text={hero_alt_text}
          mediaImages={images}
          imageCount={image_count}
          priority={priority}
          sourceUrl={source_url}
          sourceHost={sourceHost}
        />
      )}

      <CardBody
        href={href}
        title={title}
        cardPreviewHtml={cardPreviewHtml}
        contentStream={article.content_stream}
        displayTags={displayTags}
        youtubePreview={youtubePreview}
      />

      <div className="px-4 py-2">
          <div className="flex justify-center">
          <NuggetDetailLink
            href={href}
            aria-label="View full article"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
              <span>View Full Article</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M4.5 9L7.5 6L4.5 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
          </NuggetDetailLink>
        </div>
      </div>

      <CardFooter
        href={href}
        title={title}
        published_at={published_at}
        sourceHost={sourceHost}
        source_url={source_url}
        articleId={id}
        isAuthenticated={isAuthenticated}
        initialBookmarked={initialBookmarked}
        curatorDisplayName={article.curator_display_name}
        adminEditHref={adminEditHref}
        deleteRedirectTo={deleteRedirectTo}
      />
    </article>
  )
}
