import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getArticleById, getArticleMeta } from '@/lib/queries/article'
import { isArticleBookmarked } from '@/lib/queries/bookmarks'
import { ArticleBody } from '@/components/ui/article-body'
import { ArticleDetailSkeleton } from '@/components/ui/article-detail-skeleton'
import { BookmarkButton } from '@/components/ui/bookmark-button'
import { cloudinaryLoader } from '@/lib/cloudinary'
import { createClient } from '@/lib/supabase/server'

// Bookmark check requires cookies — serves dynamically per user.
// ISR via revalidateTag('article:' + id) is deferred to PR-14 when PPR is added.
export const dynamic = 'force-dynamic'

type Params = {
  id: string
  slug: string
}

type Props = {
  params: Promise<Params>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const meta = await getArticleMeta(id)

  if (!meta) {
    return { title: 'Nugget not found — Nuggets' }
  }

  return {
    title: `${meta.title} — Nuggets`,
    description: meta.excerpt ?? undefined,
    openGraph: {
      title: meta.title,
      description: meta.excerpt ?? undefined,
      images: meta.hero_thumb_url ? [{ url: meta.hero_thumb_url }] : [],
    },
    alternates: {
      canonical: `/nuggets/${id}/${meta.slug}`,
    },
  }
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

async function ArticleContent({ id, slug }: Params) {
  const article = await getArticleById(id)

  // Canonical slug redirect — 301 if URL slug is stale
  if (article.slug !== slug) {
    redirect(`/nuggets/${id}/${article.slug}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthenticated = !!user
  const bookmarked = isAuthenticated
    ? await isArticleBookmarked(article.id)
    : false

  const primaryTag = article.tag_slugs[0] ?? null

  return (
    <article className="max-w-2xl mx-auto py-8 px-4">
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-muted">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          article.content_stream === 'pulse'
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
        }`}>
          {article.content_stream === 'pulse' ? 'Market Pulse' : 'Nuggets'}
        </span>
        {primaryTag && (
          <span className="text-xs text-muted">{primaryTag}</span>
        )}
        <span className="ml-auto text-xs">{formatDate(article.published_at)}</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-primary mb-4">
        {article.title}
      </h1>

      {/* Excerpt */}
      {article.excerpt && (
        <p className="text-base text-muted leading-relaxed mb-6 border-l-2 border-border pl-4">
          {article.excerpt}
        </p>
      )}

      {/* Hero image */}
      {article.hero_thumb_url && (
        <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-8 bg-surface-raised">
          <Image
            loader={cloudinaryLoader}
            src={article.hero_thumb_url}
            alt={article.hero_alt_text ?? article.title}
            fill
            className="object-cover"
            sizes="(max-width: 672px) 100vw, 672px"
            quality={80}
            priority
          />
        </div>
      )}

      {/* Body */}
      {article.content_markdown ? (
        <ArticleBody markdown={article.content_markdown} />
      ) : (
        <p className="text-muted text-sm italic">No content available.</p>
      )}

      {/* Footer */}
      <footer className="mt-10 pt-6 border-t border-border flex flex-col gap-4">
        {/* Tags — use labels when joined data is available */}
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

        {/* Actions row */}
        <div className="flex items-center gap-3 flex-wrap">
          <BookmarkButton
            articleId={article.id}
            initialBookmarked={bookmarked}
            isAuthenticated={isAuthenticated}
            variant="detail"
          />
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

        {/* Branded author mark — no public profiles at PMF */}
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

export default async function NuggetPage({ params }: Props) {
  const { id, slug } = await params

  return (
    <Suspense fallback={<ArticleDetailSkeleton />}>
      <ArticleContent id={id} slug={slug} />
    </Suspense>
  )
}
