import Image from 'next/image'
import { NuggetDetailLink } from '@/components/ui/nugget-detail-link'
import { resolveSkimRowThumbUrl } from '@/lib/ui/skim-row-thumb'
import {
  canRenderWithNextImage,
  resolveCardImageUrl,
  shouldOptimizeImage,
  safeHostname,
} from '@/lib/ui/card-image-host'
import type { ArticleCardProps } from '@/types/article'

type Props = {
  article: ArticleCardProps
  priority?: boolean
}

function plainPreview(text: string | null): string {
  if (!text) return ''
  return text.replace(/\s+/g, ' ').trim()
}

function formatCompactDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

const skimThumbFrameClasses = 'w-[96px] shrink-0 aspect-video rounded-lg'

function SkimRowThumb({
  url,
  alt,
  priority,
  heroMediaKind,
}: {
  url: string | null
  alt: string
  priority: boolean
  heroMediaKind: ArticleCardProps['hero_media_kind']
}) {
  const resolved = resolveCardImageUrl(url)
  const canShow = canRenderWithNextImage(resolved)
  const isYouTube = heroMediaKind === 'youtube'
  const imageFitClasses = isYouTube
    ? 'object-cover'
    : 'object-contain bg-slate-100 dark:bg-slate-800'

  if (!canShow || !resolved) {
    return (
      <div
        className={`flex ${skimThumbFrameClasses} items-center justify-center bg-slate-100 text-[10px] font-medium text-muted dark:bg-slate-800`}
      >
        No preview
      </div>
    )
  }

  const host = safeHostname(resolved)
  const optimize = shouldOptimizeImage(host)

  return (
    <Image
      src={resolved}
      alt={alt}
      width={96}
      height={54}
      sizes="96px"
      priority={priority}
      unoptimized={!optimize}
      className={`${skimThumbFrameClasses} ${imageFitClasses}`}
    />
  )
}

export function ArticleSkimRow({ article, priority = false }: Props) {
  const {
    id,
    slug,
    title,
    card_preview,
    content_stream,
    published_at,
    tag_slugs,
    tag_labels,
    tag_dimensions,
    hero_alt_text,
    hero_media_kind,
  } = article

  const href = `/nuggets/${id}/${slug}`
  const preview = plainPreview(card_preview)
  const publishedLabel = formatCompactDate(published_at)
  const thumbUrl = resolveSkimRowThumbUrl(article)

  const displayTags = tag_slugs
    .map((tagSlug, index) => ({
      slug: tagSlug,
      label: tag_labels[index] ?? tagSlug,
      dimension: tag_dimensions[index] ?? null,
    }))
    .filter((tag) => tag.slug !== 'nuggets' && tag.slug !== 'pulse')

  const metaTag =
    content_stream === 'pulse'
      ? (displayTags.find((tag) => tag.dimension === 'domain') ?? displayTags[0])
      : displayTags[0]

  return (
    <article
      className="border-b border-border last:border-b-0"
      data-article-id={id}
    >
      <NuggetDetailLink
        href={href}
        className="flex min-h-[88px] items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-card-title">
            {title}
          </h2>
          {preview ? (
            <p className="line-clamp-1 text-xs leading-4 text-muted">{preview}</p>
          ) : null}
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-muted">
            {publishedLabel ? (
              <time className="tabular-nums" dateTime={published_at}>
                {publishedLabel}
              </time>
            ) : null}
            {metaTag ? (
              <>
                {publishedLabel ? (
                  <span className="text-muted/70" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <span className="truncate font-medium text-primary">{metaTag.label}</span>
              </>
            ) : null}
          </div>
        </div>
        <SkimRowThumb
          url={thumbUrl}
          alt={hero_alt_text ?? title}
          priority={priority}
          heroMediaKind={hero_media_kind}
        />
      </NuggetDetailLink>
    </article>
  )
}
