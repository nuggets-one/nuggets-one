import { getStreamLabel } from '@/lib/copy/streams'
import { createClient } from '@/lib/supabase/server'
import { resolveAuthUser } from '@/lib/supabase/resolve-auth-user'
import { getArticleById, getRelatedArticles } from '@/lib/queries/article'
import { getArticleGalleryMedia } from '@/lib/queries/article-media'
import { buildCardGalleryImages } from '@/lib/ui/build-card-gallery'
import { DetailHeroImage } from '@/components/ui/detail-hero-image'
import { ThumbnailGrid } from '@/components/ui/thumbnail-grid'
import { getBookmarkedArticleIdsForUser } from '@/lib/queries/bookmarks'
import { ArticleBody } from '@/components/ui/article-body'
import { ArticleDetailHeader } from '@/components/ui/article-detail-header'
import { ArticleDetailInlineActions } from '@/components/ui/article-detail-inline-actions'
import { ArticleDetailYouTubeHero } from '@/components/ui/article-detail-youtube-hero'
import { ConsumerDisclaimerMarkdown } from '@/components/legal/consumer-disclaimer-markdown'
import { MarkdownPageToc } from '@/components/ui/markdown-page-toc'
import { TimestampLinkInterceptor } from '@/components/ui/timestamp-link-interceptor'
import { ArticleDetailUtilityRail } from '@/components/ui/article-detail-utility-rail'
import { ArticleDetailRelated } from '@/components/ui/article-detail-related'
import {
  NUGGET_DOC_BODY_ID,
  NUGGET_YOUTUBE_HERO_ID,
} from '@/lib/ui/youtube-hero-scroll'
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
import { canManageArticle } from '@/lib/auth/can-manage-article'
import { NuggetOpenFullPageButton } from '@/components/ui/nugget-open-full-page-button'

type Props = {
  id: string
  inSheet?: boolean
}

const NUGGET_READING_PROGRESS_ID = 'nugget-reading-progress'
const DETAIL_SCROLL_OFFSET_PX = 120

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

function estimateReadingTimeMinutes(markdown: string | null): number {
  if (!markdown) return 1
  const wordCount = markdown
    .replace(/[`*_>#\-()[\]]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(1, Math.round(wordCount / 220))
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
  const [article, galleryMedia, { user }, consumerDisclaimer] = await Promise.all([
    getArticleById(id),
    getArticleGalleryMedia(id),
    resolveAuthUser(supabase),
    getConsumerDisclaimer(),
  ])
  const isAuthenticated = !!user
  const bookmarkedIds =
    user ? await getBookmarkedArticleIdsForUser(user.id, [article.id]) : new Set<string>()
  const initialBookmarked = bookmarkedIds.has(article.id)
  const isAdmin = user?.app_metadata?.is_admin === true
  const canManage = canManageArticle(user?.id, article.created_by, isAdmin)
  const editHref = canManage ? `/admin/articles/${article.id}` : null

  const isYouTubeHero = article.hero_media_kind === 'youtube'
  const trimmedHeroThumb = article.hero_thumb_url?.trim() ?? ''
  const youtubePosterFallback =
    isYouTubeHero && article.hero_video_id?.trim() && !trimmedHeroThumb
      ? youTubePosterHqUrl(article.hero_video_id)
      : null
  const heroThumbRaw = trimmedHeroThumb || youtubePosterFallback || null
  const { displayImages, totalImageCount } = buildCardGalleryImages(
    heroThumbRaw,
    galleryMedia.images,
    galleryMedia.imageCount
  )
  const useDetailGallery = displayImages.length >= 2 && !isYouTubeHero
  const heroThumbForDetail = resolveCardImageUrl(heroThumbRaw)
  const canRenderHeroImage = canRenderWithNextImage(heroThumbForDetail)
  const heroHost = heroThumbForDetail ? safeHostname(heroThumbForDetail) : ''
  const optimizeHeroImage = shouldOptimizeImage(heroHost)
  const displayTags =
    article.tags.length > 0
      ? article.tags.map((tag) => (tag.label?.trim() ? tag.label : tag.slug))
      : article.tag_slugs.slice()
  const detailHref = `/nuggets/${article.id}/${article.slug}`
  const sourceHost = getSourceHostLabel(article.source_url)
  const detailLightbox = {
    articleId: article.id,
    title: article.hero_alt_text ?? article.title,
    detailHref,
    heroThumbUrl: heroThumbRaw,
    allImages: galleryMedia.allImages,
    sourceUrl: article.source_url,
    sourceHost,
  }
  const streamLabel = getStreamLabel(article.content_stream)
  const heroImageSizes = inSheet
    ? '(max-width: 1024px) 100vw, 500px'
    : '(max-width: 768px) 100vw, 768px'
  const visibleTags = displayTags.length > 0 ? displayTags : [streamLabel]
  const bodyMarkdown = article.content_markdown?.trim() || article.excerpt?.trim() || null
  const readingTimeMinutes = estimateReadingTimeMinutes(bodyMarkdown)
  const readingTimeLabel = `${readingTimeMinutes} min read`
  const primaryTopic = visibleTags[0] ?? streamLabel

  const tocExtraction =
    !inSheet && bodyMarkdown
      ? extractMarkdownToc(bodyMarkdown)
      : { items: [], pickDepth: null, headingIdByPosition: [] as (string | undefined)[] }

  const showToc = !inSheet && tocExtraction.items.length > 0
  const headingIdsForBody =
    showToc && tocExtraction.headingIdByPosition.length > 0
      ? tocExtraction.headingIdByPosition
      : undefined

  const sourceLinkClassName = inSheet
    ? 'inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-strong px-3.5 py-2 text-xs font-semibold text-surface-strong-foreground transition-colors hover:opacity-90'
    : 'inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted transition-colors hover:border-border-strong hover:text-primary'

  const sourceAriaLabel = sourceHost
    ? `Open source on ${sourceHost} (opens in new tab)`
    : 'Open source (opens in new tab)'

  const sourceLink = article.source_url ? (
    <a
      href={article.source_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={sourceAriaLabel}
      className={sourceLinkClassName}
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
      <span>Source</span>
    </a>
  ) : null

  const relatedArticles = !inSheet
    ? await getRelatedArticles({
        articleId: article.id,
        stream: article.content_stream,
        tagSlugs: article.tag_slugs,
        limit: 4,
      })
    : []

  const inSheetHeader = (
    <header className="space-y-4">
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
      <h1 className="max-w-2xl text-sm font-semibold leading-snug tracking-tight text-primary">
        {article.title}
      </h1>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs font-medium text-muted">
        <time className="tabular-nums" dateTime={article.published_at}>
          {formatDateShort(article.published_at)}
        </time>
        <span>{readingTimeLabel}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {sourceLink}
        <NuggetOpenFullPageButton href={detailHref} />
      </div>
    </header>
  )

  const fullPageHeader = (
    <header className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
        <span>{primaryTopic}</span>
        <span className="text-border-strong" aria-hidden="true">
          /
        </span>
        <time className="tabular-nums" dateTime={article.published_at}>
          {formatDateDetail(article.published_at)}
        </time>
        <span className="text-border-strong" aria-hidden="true">
          /
        </span>
        <span>{readingTimeLabel}</span>
        {sourceHost ? (
          <>
            <span className="text-border-strong" aria-hidden="true">
              /
            </span>
            <span>{sourceHost}</span>
          </>
        ) : null}
      </div>

      <h1 className="max-w-[24ch] text-2xl font-semibold leading-[1.2] tracking-tight text-primary sm:text-3xl lg:text-[2rem]">
        {article.title}
      </h1>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {sourceLink}
        <div className="xl:hidden">
          <ArticleDetailInlineActions
            articleId={article.id}
            title={article.title}
            href={detailHref}
            sourceUrl={article.source_url}
            sourceHost={sourceHost}
            isAuthenticated={isAuthenticated}
            initialBookmarked={initialBookmarked}
            editHref={editHref}
            canDelete={canManage}
          />
        </div>
      </div>
    </header>
  )

  const heroSection = (
    <section
      id={isYouTubeHero && article.hero_video_id?.trim() ? NUGGET_YOUTUBE_HERO_ID : undefined}
      className={inSheet ? 'overflow-hidden rounded-2xl bg-surface-raised' : ''}
    >
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
          preferInlinePlayback={inSheet}
        />
      ) : useDetailGallery ? (
        <ThumbnailGrid
          title={article.hero_alt_text ?? article.title}
          images={displayImages}
          totalCount={totalImageCount}
          sourceUrl={article.source_url}
          sourceHost={sourceHost}
          variant="detail"
          priority
          imageSizes={heroImageSizes}
          lightbox={detailLightbox}
        />
      ) : canRenderHeroImage && heroThumbForDetail ? (
        <DetailHeroImage
          articleId={article.id}
          title={article.hero_alt_text ?? article.title}
          detailHref={detailHref}
          heroThumbUrl={heroThumbRaw}
          allImages={galleryMedia.allImages}
          totalImageCount={galleryMedia.imageCount}
          sourceUrl={article.source_url}
          sourceHost={sourceHost}
          imageUrl={heroThumbForDetail}
          alt={article.hero_alt_text ?? article.title}
          imageSizes={heroImageSizes}
          priority
          unoptimized={!optimizeHeroImage}
          useFetchRaster={heroThumbForDetail.includes('/image/fetch/')}
        />
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
          : 'text-xs italic leading-relaxed text-muted'
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

  const referencesSection = !inSheet && article.source_url ? (
    <section className="border-t border-border pt-8" aria-labelledby="references-heading">
      <h2 id="references-heading" className="text-lg font-semibold tracking-tight text-primary">
        References
      </h2>
      <ol className="mt-4 space-y-2 text-sm leading-6 text-muted">
        <li>
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-body-link underline underline-offset-2 transition-opacity hover:opacity-90"
          >
            Original source {sourceHost ? `(${sourceHost})` : ''}
          </a>
        </li>
      </ol>
    </section>
  ) : null

  if (inSheet) {
    return (
      <article className="mx-auto w-full max-w-none pb-4">
        <ArticleDetailHeader
          articleId={article.id}
          title={article.title}
          href={detailHref}
          inSheet
          sourceUrl={article.source_url}
          sourceHost={sourceHost}
          isAuthenticated={isAuthenticated}
          initialBookmarked={initialBookmarked}
          editHref={editHref}
          canDelete={canManage}
        />

        <div className="space-y-5 px-4 pb-4 pt-5 sm:px-5">
          {inSheetHeader}
          {heroSection}
          <div
            id={showToc || (isYouTubeHero && article.hero_video_id?.trim()) ? NUGGET_DOC_BODY_ID : undefined}
            className="space-y-5"
          >
            {bodyBlock}
            {disclaimerSection}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="mx-auto w-full pb-12">
      <div className="mx-auto w-full max-w-[90rem] px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div
          className={
            showToc
              ? 'lg:grid lg:grid-cols-[minmax(180px,220px)_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[minmax(180px,220px)_minmax(0,68ch)_minmax(190px,240px)] xl:gap-12'
              : 'xl:grid xl:grid-cols-[minmax(0,68ch)_minmax(190px,240px)] xl:gap-12'
          }
        >
          {showToc ? (
            <aside className="print:hidden lg:col-start-1 lg:row-start-1">
              <MarkdownPageToc
                items={tocExtraction.items}
                scrollRootId={NUGGET_DOC_BODY_ID}
                scrollOffsetPx={DETAIL_SCROLL_OFFSET_PX}
              />
            </aside>
          ) : null}

          <div className={showToc ? 'min-w-0 lg:col-start-2 xl:col-start-2' : 'min-w-0 xl:col-start-1'}>
            <div className="mx-auto w-full max-w-[70ch] space-y-8 sm:space-y-9">
              <section id={NUGGET_READING_PROGRESS_ID} className="space-y-8 sm:space-y-9">
                {fullPageHeader}
                {heroSection}

                <div id={NUGGET_DOC_BODY_ID} className="space-y-8">
                  {bodyBlock}
                </div>

                {referencesSection}
                {disclaimerSection}
              </section>
              <ArticleDetailRelated items={relatedArticles} />
            </div>
          </div>

          <aside
            className={showToc ? 'hidden xl:col-start-3 xl:row-start-1 xl:block' : 'hidden xl:col-start-2 xl:row-start-1 xl:block'}
          >
            <ArticleDetailUtilityRail
              articleId={article.id}
              title={article.title}
              href={detailHref}
              sourceUrl={article.source_url}
              sourceHost={sourceHost}
              isAuthenticated={isAuthenticated}
              initialBookmarked={initialBookmarked}
              editHref={editHref}
              canDelete={canManage}
              publishedLabel={formatDateDetail(article.published_at)}
              readingTimeLabel={readingTimeLabel}
              tocItems={tocExtraction.items}
              scrollRootId={NUGGET_DOC_BODY_ID}
              progressRootId={NUGGET_READING_PROGRESS_ID}
              scrollOffsetPx={DETAIL_SCROLL_OFFSET_PX}
            />
          </aside>
        </div>
      </div>
    </article>
  )
}
