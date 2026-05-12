import Image from 'next/image'
import { permanentRedirect } from 'next/navigation'
import { getArticleById } from '@/lib/queries/article'
import { ArticleBody } from '@/components/ui/article-body'
import { TimestampLinkInterceptor } from '@/components/ui/timestamp-link-interceptor'
import { YouTubePlayer } from '@/components/ui/youtube-player'
import {
  canRenderWithNextImage,
  safeHostname,
  shouldOptimizeImage,
} from '@/lib/ui/card-image-host'
import { youTubePosterHqUrl } from '@/lib/ui/excerpt-card'
import { formatTagDisplayLabel } from '@/lib/ui/tag-display-label'

type Props = {
  id: string
  slug: string
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function estimateReadMinutes(markdown: string | null): number | null {
  if (!markdown) return null
  const words = markdown.trim().split(/\s+/).filter(Boolean).length
  if (words === 0) return null
  return Math.max(1, Math.round(words / 225))
}

/**
 * Server Component used by both the canonical /nuggets/[id]/[slug] page and
 * the parallel-slot @modal/(.)nuggets/[id]/[slug] sheet (Phase 15).
 *
 * Slug canonicalization happens here. When the slug in the URL is stale, we
 * `permanentRedirect` — in the intercepted (sheet) context that traversal
 * closes the parallel slot back to the canonical route.
 */
export async function ArticleContent({ id, slug }: Props) {
  const article = await getArticleById(id)

  if (article.slug !== slug) {
    permanentRedirect(`/nuggets/${id}/${article.slug}`)
  }

  const primaryTagSlug = article.tag_slugs[0] ?? null
  const isYouTubeHero =
    article.hero_media_kind === 'youtube' || (article.hero_media_kind as string) === 'video'
  const trimmedHeroThumb = article.hero_thumb_url?.trim() ?? ''
  const youtubePosterFallback =
    isYouTubeHero && article.hero_video_id?.trim() && !trimmedHeroThumb
      ? youTubePosterHqUrl(article.hero_video_id)
      : null
  const heroThumbForDetail = trimmedHeroThumb || youtubePosterFallback || null
  const canRenderHeroImage = canRenderWithNextImage(heroThumbForDetail)
  const heroHost = heroThumbForDetail ? safeHostname(heroThumbForDetail) : ''
  const optimizeHeroImage = shouldOptimizeImage(heroHost)
  const displayTags = article.tags.length > 0
    ? article.tags.map((tag) => tag.label)
    : article.tag_slugs.map((tag) => formatTagDisplayLabel(tag))
  const readMinutes = estimateReadMinutes(article.content_markdown)
  const primaryTag = primaryTagSlug
    ? formatTagDisplayLabel(
        article.tags.find((tag) => tag.slug === primaryTagSlug)?.label ?? primaryTagSlug
      )
    : null

  return (
    <article className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-3 flex flex-wrap gap-1">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
            article.content_stream === 'pulse'
              ? 'bg-pulse-chip-bg text-pulse-chip-fg'
              : 'border border-border bg-surface-raised text-muted'
          }`}
        >
          {article.content_stream === 'pulse' ? 'Market Pulse' : 'Nuggets'}
        </span>
        {displayTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full border border-border bg-rail px-2 py-0.5 text-[10px] font-medium text-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      <h1 className="mb-3 text-[0.9375rem] font-semibold leading-[1.35] tracking-tight text-primary">
        {article.title}
      </h1>

      <div className="mb-3 flex items-center gap-4 text-xs font-medium text-muted">
        {readMinutes && <span>{readMinutes} min read</span>}
        {primaryTag && <span>{primaryTag}</span>}
        <span>{formatDate(article.published_at)}</span>
      </div>

      {article.source_url && (
        <a
          href={article.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[11px] font-semibold text-accent-emphasis transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Source
        </a>
      )}

      {isYouTubeHero && article.hero_video_id?.trim() ? (
        <YouTubePlayer
          videoId={article.hero_video_id}
          posterUrl={heroThumbForDetail}
          title={article.title}
        />
      ) : (
        canRenderHeroImage && heroThumbForDetail ? (
          <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-8 bg-surface-raised">
            <Image
              src={heroThumbForDetail}
              alt={article.hero_alt_text ?? article.title}
              fill
              className="object-cover"
              sizes="(max-width: 672px) 100vw, 672px"
              quality={80}
              priority
              unoptimized={!optimizeHeroImage}
            />
          </div>
        ) : (
          <div className="mb-8 flex aspect-video w-full items-center justify-center rounded-xl bg-surface-raised text-xs text-muted">
            Media unavailable
          </div>
        )
      )}

      {article.excerpt && (
        <p className="mb-4 border-l-2 border-border pl-4 text-xs leading-relaxed text-muted">
          {article.excerpt}
        </p>
      )}

      {article.content_markdown ? (
        isYouTubeHero && article.hero_video_id?.trim() ? (
          <TimestampLinkInterceptor>
            <ArticleBody markdown={article.content_markdown} />
          </TimestampLinkInterceptor>
        ) : (
          <ArticleBody markdown={article.content_markdown} />
        )
      ) : (
        <p className="text-muted text-sm italic">No content available.</p>
      )}

      <section className="mt-4 border-t border-border pt-2 text-[10px] italic leading-snug text-muted">
        Curated summaries and links are informational only—they are not financial, investment, legal, or tax advice.
      </section>
    </article>
  )
}
