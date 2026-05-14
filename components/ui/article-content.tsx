import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getArticleById } from '@/lib/queries/article'
import { getBookmarkedArticleIdsForUser } from '@/lib/queries/bookmarks'
import { ArticleBody } from '@/components/ui/article-body'
import { ArticleDetailHeader } from '@/components/ui/article-detail-header'
import { CardMediaRaster } from '@/components/ui/card-media-raster'
import { TimestampLinkInterceptor } from '@/components/ui/timestamp-link-interceptor'
import { YouTubePlayer } from '@/components/ui/youtube-player'
import {
  canRenderWithNextImage,
  resolveCardImageUrl,
  safeHostname,
  shouldOptimizeImage,
} from '@/lib/ui/card-image-host'
import { youTubePosterHqUrl } from '@/lib/ui/excerpt-card'
import { formatTagDisplayLabel } from '@/lib/ui/tag-display-label'

type Props = {
  id: string
  inSheet?: boolean
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function getSourceHostLabel(url: string | null): string | null {
  if (!url) return null

  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function getStreamLabel(stream: 'standard' | 'pulse'): string {
  return stream === 'pulse' ? 'Market Pulse' : 'Nuggets'
}

/**
 * Shared server-rendered nugget detail body used by both shells of the
 * canonical /nuggets/[id]/[slug] route:
 * - direct/deep-link hits -> full page shell
 * - intercepted in-app navigation -> nugget detail sheet
 *
 * Route shells are responsible for slug canonicalization before they render
 * this component, so this body can focus purely on published detail content.
 */
export async function ArticleContent({ id, inSheet = false }: Props) {
  const supabase = await createClient()
  const [article, authResult] = await Promise.all([
    getArticleById(id),
    supabase.auth.getUser(),
  ])
  const user = authResult.data.user
  const isAuthenticated = !!user
  const bookmarkedIds =
    user ? await getBookmarkedArticleIdsForUser(user.id, [article.id]) : new Set<string>()
  const initialBookmarked = bookmarkedIds.has(article.id)

  const isYouTubeHero = article.hero_media_kind === 'youtube'
  const trimmedHeroThumb = article.hero_thumb_url?.trim() ?? ''
  const youtubePosterFallback =
    isYouTubeHero && article.hero_video_id?.trim() && !trimmedHeroThumb
      ? youTubePosterHqUrl(article.hero_video_id)
      : null
  const heroThumbForDetail = resolveCardImageUrl(trimmedHeroThumb || youtubePosterFallback || null)
  const canRenderHeroImage = canRenderWithNextImage(heroThumbForDetail)
  const heroHost = heroThumbForDetail ? safeHostname(heroThumbForDetail) : ''
  const optimizeHeroImage = shouldOptimizeImage(heroHost)
  const displayTags =
    article.tags.length > 0
    ? article.tags.map((tag) => tag.label)
    : article.tag_slugs.map((tag) => formatTagDisplayLabel(tag))
  const detailHref = `/nuggets/${article.id}/${article.slug}`
  const sourceHost = getSourceHostLabel(article.source_url)
  const streamLabel = getStreamLabel(article.content_stream)
  const heroImageSizes = inSheet
    ? '(max-width: 1024px) 100vw, 500px'
    : '(max-width: 768px) 100vw, 768px'
  const visibleTags = displayTags.length > 0 ? displayTags : [streamLabel]
  const bodyMarkdown = article.content_markdown?.trim() || article.excerpt?.trim() || null

  return (
    <article className={`mx-auto w-full pb-8 ${inSheet ? 'max-w-none' : 'max-w-3xl'}`}>
      <ArticleDetailHeader
        articleId={article.id}
        title={article.title}
        href={detailHref}
        inSheet={inSheet}
        sourceUrl={article.source_url}
        sourceHost={sourceHost}
        isAuthenticated={isAuthenticated}
        initialBookmarked={initialBookmarked}
      />

      <div className={`px-4 pt-5 sm:px-5 ${inSheet ? 'space-y-5 sm:pt-5' : 'space-y-6 sm:space-y-7 sm:pt-6'}`}>
        <header className={inSheet ? 'space-y-4' : 'space-y-4 sm:space-y-5'}>
          <div className="flex flex-wrap gap-2">
            {visibleTags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  index === 0 && displayTags.length === 0 && article.content_stream === 'pulse'
                    ? 'border-transparent bg-pulse-chip-bg text-pulse-chip-fg'
                    : 'border-border bg-rail text-muted'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            <h1
              className={`max-w-2xl font-semibold tracking-tight text-primary ${
                inSheet
                  ? 'text-sm leading-snug'
                  : 'text-2xl leading-tight sm:text-[1.8rem]'
              }`}
            >
              {article.title}
            </h1>

            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 font-medium text-muted ${inSheet ? 'text-xs' : 'text-sm'}`}>
              <span>{formatDate(article.published_at)}</span>
            </div>
          </div>

          {article.source_url && (
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-strong px-3.5 py-2 text-xs font-semibold text-surface-strong-foreground transition-colors hover:opacity-90"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 5h5m0 0v5m0-5L10 14"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 9v10h10"
                />
              </svg>
              <span>{sourceHost ? `Source: ${sourceHost}` : 'View Source'}</span>
            </a>
          )}
        </header>

        <section className="overflow-hidden rounded-2xl bg-surface-raised">
          {isYouTubeHero && article.hero_video_id?.trim() ? (
            <YouTubePlayer
              videoId={article.hero_video_id}
              posterUrl={heroThumbForDetail}
              title={article.title}
            />
          ) : canRenderHeroImage && heroThumbForDetail ? (
            <div className="relative aspect-video w-full">
              {heroThumbForDetail.includes('/image/fetch/') ? (
                <CardMediaRaster
                  src={heroThumbForDetail}
                  alt={article.hero_alt_text ?? article.title}
                  priority
                />
              ) : (
                <Image
                  src={heroThumbForDetail}
                  alt={article.hero_alt_text ?? article.title}
                  fill
                  className="object-cover"
                  sizes={heroImageSizes}
                  quality={80}
                  priority
                  unoptimized={!optimizeHeroImage}
                />
              )}
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center text-sm text-muted">
              Media unavailable
            </div>
          )}
        </section>

        <div className={`${inSheet ? 'space-y-5 pb-6' : 'max-w-prose space-y-6 pb-8 sm:space-y-7'}`}>
          {bodyMarkdown ? (
            isYouTubeHero && article.hero_video_id?.trim() ? (
              <TimestampLinkInterceptor heroVideoId={article.hero_video_id.trim()}>
                <ArticleBody markdown={bodyMarkdown} compact={inSheet} />
              </TimestampLinkInterceptor>
            ) : (
              <ArticleBody markdown={bodyMarkdown} compact={inSheet} />
            )
          ) : (
            <p className="text-sm italic text-muted">No content available.</p>
          )}

          <section className="border-t border-border pt-4 text-xs italic leading-relaxed text-muted">
            Curated summaries and links are informational only—they are not financial,
            investment, legal, or tax advice.
          </section>
        </div>
      </div>
    </article>
  )
}
