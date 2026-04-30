import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArticleFormFields } from '../_components/article-form-fields'
import type { ArticleFormDefaults } from '../_components/article-form-fields'
import { updateArticleAction, publishArticleAction, unpublishArticleAction } from '@/lib/actions/admin'
import { DeleteArticleButton } from '../_components/DeleteArticleButton'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }
const PUBLISH_ERRORS: Record<string, string> = {
  title_required: 'Add a title before publishing.',
  body_required: 'Add content before publishing.',
  stream_required: 'Select a stream before publishing.',
  source_url_invalid: 'Source URL must be a valid http(s) link.',
  publish_validation_failed: 'Article could not be published. Fix the required fields and retry.',
  // S6-F4: tag resolution errors from upsert_article_tags RPC
  unknown_tags: 'One or more tag slugs were not found. Check Tags admin and retry.',
  tag_update_failed: 'Tag update failed. Please try again.',
}

export default async function EditArticlePage({
  params,
  searchParams,
}: Props & { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const errorCode = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0]
    : resolvedSearchParams.error
  const db = createAdminClient()

  const { data: article } = await db
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (!article) notFound()

  const isPublished = article.status === 'published'

  const defaults: ArticleFormDefaults = {
    id:               article.id as string,
    title:            article.title as string,
    excerpt:          article.excerpt as string | null,
    content_markdown: article.content_markdown as string | null,
    content_stream:   article.content_stream as string,
    source_url:       article.source_url as string | null,
    hero_thumb_url:   article.hero_thumb_url as string | null,
    hero_alt_text:    article.hero_alt_text as string | null,
    tag_slugs:        (article.tag_slugs as string[] | null) ?? [],
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-primary flex-1 truncate">{article.title as string}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${
          isPublished
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
        }`}>
          {article.status as string}
        </span>
      </div>

      {errorCode && (
        // Audit S6-F3 decision: publish validation errors are user-visible and code-driven.
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {PUBLISH_ERRORS[errorCode] ?? PUBLISH_ERRORS.publish_validation_failed}
        </p>
      )}

      <div className="flex gap-2 mb-8 pb-6 border-b border-border">
        {isPublished ? (
          <form action={unpublishArticleAction}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted hover:text-primary hover:bg-surface-raised transition-colors"
            >
              Unpublish
            </button>
          </form>
        ) : (
          <form action={publishArticleAction}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Publish
            </button>
          </form>
        )}

        <DeleteArticleButton id={id} />

        {isPublished && (
          <Link
            href={`/nuggets/${id}/${article.slug as string}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-primary transition-colors"
          >
            View live ↗
          </Link>
        )}
      </div>

      <form action={updateArticleAction} className="flex flex-col gap-4">
        <ArticleFormFields defaults={defaults} />
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-accent text-black text-sm font-medium hover:opacity-90"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  )
}
