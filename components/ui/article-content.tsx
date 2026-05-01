import Image from 'next/image'
import { permanentRedirect } from 'next/navigation'
import { getArticleById } from '@/lib/queries/article'
import { ArticleBody } from '@/components/ui/article-body'
import { BookmarkButton } from '@/components/ui/bookmark-button'
import { BookmarkBatchHydrator } from '@/components/ui/bookmark-batch-hydrator'
import { TimestampLinkInterceptor } from '@/components/ui/timestamp-link-interceptor'
import { YouTubePlayer } from '@/components/ui/youtube-player'
import { youTubePosterHqUrl } from '@/lib/ui/excerpt-card'

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

  const primaryTag = article.tag_slugs[0] ?? null

  return (
    <article className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-muted">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            article.content_stream === 'pulse'
              ? 'bg-pulse-chip-bg text-pulse-chip-fg'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          {article.content_stream === 'pulse' ? 'Market Pulse' : 'Nuggets'}
        </span>
        {primaryTag && <span className="text-xs text-muted">{primaryTag}</span>}
        <span className="ml-auto text-xs">{formatDate(article.published_at)}</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-primary mb-4">
        {article.title}
      </h1>

      {article.excerpt && (
        <p className="text-base text-muted leading-relaxed mb-6 border-l-2 border-border pl-4">
          {article.excerpt}
        </p>
      )}

      {article.hero_media_kind === 'youtube' && article.hero_video_id ? (
        <YouTubePlayer
          videoId={article.hero_video_id}
          posterUrl={
            article.hero_thumb_url?.trim() ||
            youTubePosterHqUrl(article.hero_video_id)
          }
          title={article.title}
        />
      ) : (
        article.hero_thumb_url && (
          <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-8 bg-surface-raised">
            <Image
              src={article.hero_thumb_url}
              alt={article.hero_alt_text ?? article.title}
              fill
              className="object-cover"
              sizes="(max-width: 672px) 100vw, 672px"
              quality={80}
              priority
            />
          </div>
        )
      )}

      {article.content_markdown ? (
        article.hero_media_kind === 'youtube' && article.hero_video_id ? (
          <TimestampLinkInterceptor>
            <ArticleBody markdown={article.content_markdown} />
          </TimestampLinkInterceptor>
        ) : (
          <ArticleBody markdown={article.content_markdown} />
        )
      ) : (
        <p className="text-muted text-sm italic">No content available.</p>
      )}

      <footer className="mt-10 pt-6 border-t border-border flex flex-col gap-4">
        {article.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full px-3 py-1 text-xs font-medium bg-surface-raised text-muted border border-border"
              >
                {tag.label}
              </span>
            ))}
          </div>
        ) : article.tag_slugs.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {article.tag_slugs.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-xs font-medium bg-surface-raised text-muted border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-3 flex-wrap">
          <BookmarkButton
            articleId={article.id}
            initialBookmarked={false}
            variant="detail"
          />
          <BookmarkBatchHydrator articleIds={[article.id]} />
          {article.source_url && (
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors"
            >
              View source ↗
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent text-black font-bold text-xs select-none">
            N
          </span>
          <span>Nuggets</span>
        </div>
      </footer>
    </article>
  )
}
