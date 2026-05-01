import { CardMedia } from '@/components/ui/card-media'
import { CardBody } from '@/components/ui/card-body'
import { CardFooter } from '@/components/ui/card-footer'
import { CardThumbnailGrid } from '@/components/ui/card-thumbnail-grid'
import { isYouTubeUrl, youTubePosterHqUrl } from '@/lib/ui/excerpt-card'
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
    excerptHtml,
    published_at,
    hero_thumb_url,
    hero_alt_text,
    hero_media_kind,
    hero_video_id,
    tag_slugs,
    source_url,
    images,
  } = article

  const href = `/nuggets/${id}/${slug}`
  const displayTagSlugs = tag_slugs.filter(
    (t) => t !== 'nuggets' && t !== 'pulse'
  )
  const primaryTag = displayTagSlugs[0] ?? null
  const secondaryTag = displayTagSlugs[1] ?? null
  const overflowMobile = Math.max(0, displayTagSlugs.length - 1)
  const overflowDesktop = Math.max(0, displayTagSlugs.length - 2)
  const sourceHost = getSourceHostLabel(source_url)

  const trimmedHeroThumb = hero_thumb_url?.trim() ?? ''
  const youtubePosterFallback =
    hero_media_kind === 'youtube' && hero_video_id?.trim() && !trimmedHeroThumb
      ? youTubePosterHqUrl(hero_video_id)
      : null
  const heroThumbForCard = trimmedHeroThumb || youtubePosterFallback || null

  const ytMedia =
    hero_media_kind === 'youtube' ||
    isYouTubeUrl(source_url) ||
    (heroThumbForCard?.toLowerCase().includes('ytimg.com') ?? false)
  const useThumbnailGrid = images.length >= 2

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-transform duration-150 motion-reduce:transition-none motion-safe:hover:-translate-y-px hover:shadow-md dark:border-zinc-700/80 dark:shadow-black/20 focus-within:ring-2 focus-within:ring-accent">
      {useThumbnailGrid ? (
        <CardThumbnailGrid
          href={href}
          title={hero_alt_text ?? title}
          images={images}
          totalCount={images.length}
          sourceHost={sourceHost}
          source_url={source_url}
        />
      ) : (
        <CardMedia
          href={href}
          id={id}
          title={title}
          hero_thumb_url={heroThumbForCard}
          hero_alt_text={hero_alt_text}
          ytMedia={ytMedia}
          priority={priority}
          sourceHost={sourceHost}
          source_url={source_url}
        />
      )}

      <CardBody
        href={href}
        title={title}
        excerptHtml={excerptHtml}
        displayTagSlugs={displayTagSlugs}
        primaryTag={primaryTag}
        secondaryTag={secondaryTag}
        overflowMobile={overflowMobile}
        overflowDesktop={overflowDesktop}
      />

      <CardFooter
        href={href}
        title={title}
        published_at={published_at}
        articleId={id}
        isAuthenticated={isAuthenticated}
        initialBookmarked={initialBookmarked}
      />
    </article>
  )
}
