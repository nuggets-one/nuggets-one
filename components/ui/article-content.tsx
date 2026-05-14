import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getArticleById } from '@/lib/queries/article'
import { getBookmarkedArticleIdsForUser } from '@/lib/queries/bookmarks'
import { ArticleBody } from '@/components/ui/article-body'
import { ArticleDetailHeader } from '@/components/ui/article-detail-header'
import { ArticleDetailInlineActions } from '@/components/ui/article-detail-inline-actions'
import { ArticleDetailYouTubeHero } from '@/components/ui/article-detail-youtube-hero'
import { ConsumerDisclaimerMarkdown } from '@/components/legal/consumer-disclaimer-markdown'
import { CardMediaRaster } from '@/components/ui/card-media-raster'
import { MarkdownPageToc } from '@/components/ui/markdown-page-toc'
import { TimestampLinkInterceptor } from '@/components/ui/timestamp-link-interceptor'
import {
  canRenderWithNextImage,
  resolveCardImageUrl,
  safeHostname,
  shouldOptimizeImage,
} from '@/lib/ui/card-image-host'
import { youTubePosterHqUrl } from '@/lib/ui/excerpt-card'
import { getSourceHostLabel } from '@/lib/ui/source-host-label'
import { getConsumerDisclaimer } from '@/lib/queries/site-settings'
import { extractMarkdownToc } from '@/lib/markdown/extract-markdown-toc'

const NUGGET_DOC_BODY_ID = 'nugget-doc-body'

type Props = {
  id: string
  inSheet?: boolean
}

function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function formatDateDetail(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
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
  const [article, authResult, consumerDisclaimer] = await Promise.all([
    getArticleById(id),
    supabase.auth.getUser(),
    getConsumerDisclaimer(),
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
      ? article.tags.map((tag) => (tag.label?.trim() ? tag.label : tag.slug))
      : article.tag_slugs.slice()
  const detailHref = `/nuggets/${article.id}/${article.slug}`
  const sourceHost = getSourceHostLabel(article.source_url)
  const streamLabel = getStreamLabel(article.content_stream)
  const heroImageSizes = inSheet
    ? '(max-width: 1024px) 100vw, 500px'
    : '(max-width: 768px) 100vw, 768px'
  const visibleTags = displayTags.length > 0 ? displayTags : [streamLabel]
  const bodyMarkdown = article.content_markdown?.trim() || article.excerpt?.trim() || null

  const tocExtraction =
    !inSheet && bodyMarkdown
      ? extractMarkdownToc(bodyMarkdown)
      : { items: [], pickDepth: null, headingIdByPosition: [] as (string | undefined)[] }

  const showToc = !inSheet && tocExtraction.items.length > 0
  const headingIdsForBody =
    showToc && tocExtraction.headingIdByPosition.length > 0
      ? tocExtraction.headingIdByPosition
      : undefined

  const formatDate = inSheet ? formatDateShort : formatDateDetail

  const metaHeader = (
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
          className={`font-semibold tracking-tight text-primary ${
            inSheet
              ? 'max-w-2xl text-sm leading-snug'
              : 'max-w-3xl text-2xl leading-tight sm:text-3xl sm:leading-snug'
          }`}
        >
          {article.title}
        </h1>

        <div
          className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 font-medium text-muted ${
            inSheet ? 'text-xs' : 'text-sm'
          }`}
        >
          <time className="tabular-nums" dateTime={article.published_at}>
            {formatDate(article.published_at)}
          </time>
          {!inSheet ? (
            <ArticleDetailInlineActions
              articleId={article.id}
              title={article.title}
              href={detailHref}
              sourceUrl={article.source_url}
              sourceHost={sourceHost}
              isAuthenticated={isAuthenticated}
              initialBookmarked={initialBookmarked}
            />
          ) : null}
        </div>
      </div>

      {article.source_url && (
        <a
          href={article.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className={
            inSheet
              ? 'inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-strong px-3.5 py-2 text-xs font-semibold text-surface-strong-foreground transition-colors hover:opacity-90'
              : 'inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:bg-surface-raised hover:text-primary'
          }
        >
          <svg
            className="h-3.5 w-3.5 shrink-0"
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
  )

  const heroSection = (
    <section className={inSheet ? 'overflow-hidden rounded-2xl bg-surface-raised' : ''}>
      {isYouTubeHero && article.hero_video_id?.trim() ? (
        <ArticleDetailYouTubeHero
          videoId={article.hero_video_id.trim()}
          title={article.title}
          heroThumbUrl={heroThumbForDetail}
          heroAltText={article.hero_alt_text}
          articleId={article.id}
          sourceUrl={article.source_url}
          sourceHost={sourceHost}
          imageSizes={heroImageSizes}
        />
      ) : canRenderHeroImage && heroThumbForDetail ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-surface-raised">
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
        <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-surface-raised text-sm text-muted">
          Media unavailable
        </div>
      )}
    </section>
  )

  const bodyBlock =
    bodyMarkdown ? (
      isYouTubeHero && article.hero_video_id?.trim() ? (
        <TimestampLinkInterceptor
          heroVideoId={article.hero_video_id.trim()}
          videoTitle={article.title}
          articleId={article.id}
        >
          <ArticleBody
            markdown={bodyMarkdown}
            compact={inSheet}
            headingIdByPosition={headingIdsForBody}
          />
        </TimestampLinkInterceptor>
      ) : (
        <ArticleBody
          markdown={bodyMarkdown}
          compact={inSheet}
          headingIdByPosition={headingIdsForBody}
        />
      )
    ) : (
      <p className="text-sm italic text-muted">No content available.</p>
    )

  const disclaimerSection = (
    <section
      className={
        inSheet
          ? 'mt-3 border-t border-border pt-2'
          : 'border-t border-border pt-4 text-xs italic leading-relaxed text-muted'
      }
    >
      <ConsumerDisclaimerMarkdown
        markdown={consumerDisclaimer}
        className={
          inSheet
            ? '!text-[10px] !leading-snug italic text-muted prose-p:!text-[10px] prose-p:!leading-snug prose-p:italic prose-strong:!font-normal prose-strong:!text-muted prose-em:italic'
            : undefined
        }
        anchorClassName={
          inSheet
            ? 'font-inherit text-body-link underline underline-offset-2 transition-opacity hover:opacity-90'
            : undefined
        }
      />
    </section>
  )

  const topBlockClassName = inSheet
    ? 'space-y-5 px-4 pt-5 sm:px-5 sm:pt-5'
    : showToc
      ? 'space-y-6 pt-6 sm:space-y-7 sm:pt-7'
      : 'space-y-6 pt-6 sm:space-y-7 sm:pt-7'

  const docBlockClassName = [
    inSheet
      ? 'space-y-5 px-4 pb-6 sm:px-5'
      : showToc
        ? 'space-y-6 pb-10 sm:space-y-7'
        : 'space-y-6 pb-10 sm:space-y-7',
    !inSheet ? 'max-w-prose' : '',
  ]
    .join(' ')
    .trim()

  const mainColumnInner = (
    <>
      <div className={topBlockClassName}>
        {metaHeader}
        {heroSection}
      </div>

      <div id={showToc ? NUGGET_DOC_BODY_ID : undefined} className={docBlockClassName}>
        {bodyBlock}
        {disclaimerSection}
      </div>
    </>
  )

  const articleShell = (
    <>
      {inSheet ? (
        <ArticleDetailHeader
          articleId={article.id}
          title={article.title}
          href={detailHref}
          inSheet
          sourceUrl={article.source_url}
          sourceHost={sourceHost}
          isAuthenticated={isAuthenticated}
          initialBookmarked={initialBookmarked}
        />
      ) : null}

      {showToc ? (
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10 lg:pt-1">
            <aside className="print:hidden">
              <MarkdownPageToc
                items={tocExtraction.items}
                scrollRootId={NUGGET_DOC_BODY_ID}
                scrollOffsetPx={120}
              />
            </aside>
            <div className="min-w-0">{mainColumnInner}</div>
          </div>
        </div>
      ) : inSheet ? (
        mainColumnInner
      ) : (
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">{mainColumnInner}</div>
        </div>
      )}
    </>
  )

  return (
    <article className={`mx-auto w-full ${inSheet ? 'max-w-none pb-8' : 'pb-10'}`}>{articleShell}</article>
  )
}
