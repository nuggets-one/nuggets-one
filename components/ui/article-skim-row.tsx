import Image from 'next/image'
import { NuggetDetailLink } from '@/components/ui/nugget-detail-link'
import { formatRelativeTime } from '@/lib/ui/relative-time'
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

function SkimRowThumb({ url, alt, priority }: { url: string | null; alt: string; priority: boolean }) {
  const resolved = resolveCardImageUrl(url)
  const canShow = canRenderWithNextImage(resolved)

  if (!canShow || !resolved) {
    return (
      <div className="flex size-[72px] shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-medium text-muted dark:bg-slate-800">
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
      width={72}
      height={72}
      sizes="72px"
      priority={priority}
      unoptimized={!optimize}
      className="size-[72px] shrink-0 rounded-lg object-cover"
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
    hero_alt_text,
  } = article

  const href = `/nuggets/${id}/${slug}`
  const preview = plainPreview(card_preview)
  const relativeTime = formatRelativeTime(published_at)
  const thumbUrl = resolveSkimRowThumbUrl(article)

  const displayTags = tag_slugs
    .map((tagSlug, index) => ({
      slug: tagSlug,
      label: tag_labels[index] ?? tagSlug,
    }))
    .filter((tag) => tag.slug !== 'nuggets' && tag.slug !== 'pulse')

  const primaryTag = displayTags[0]
  const streamBadge = content_stream === 'pulse' ? 'Pulse' : null

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
            {relativeTime ? <time dateTime={published_at}>{relativeTime}</time> : null}
            {streamBadge ? (
              <>
                {relativeTime ? (
                  <span className="text-muted/70" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <span className="font-medium text-primary">{streamBadge}</span>
              </>
            ) : primaryTag ? (
              <>
                {relativeTime ? (
                  <span className="text-muted/70" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <span className="truncate font-medium text-primary">{primaryTag.label}</span>
              </>
            ) : null}
          </div>
        </div>
        <SkimRowThumb url={thumbUrl} alt={hero_alt_text ?? title} priority={priority} />
      </NuggetDetailLink>
    </article>
  )
}
