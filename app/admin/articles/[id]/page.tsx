import 'server-only'

import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArticleFormFields } from '../_components/article-form-fields'
import type { ArticleFormDefaults } from '../_components/article-form-fields'
import { ArticleFormShell } from '../_components/article-form-shell'
import { updateArticleAction, publishArticleAction } from '@/lib/actions/admin'
import { DeleteArticleButton } from '../_components/DeleteArticleButton'
import { UnpublishButton } from '../_components/UnpublishButton'
import type { TagSummary } from '@/types/article'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }
const PUBLISH_ERRORS: Record<string, string> = {
  title_required: 'Add a title before publishing.',
  title_too_long: 'Title is too long (max 300 characters).',
  body_required: 'Add content before publishing.',
  stream_required: 'Select a stream before publishing.',
  source_url_invalid: 'Source URL must be a valid http(s) link.',
  publish_validation_failed: 'Article could not be published. Fix the required fields and retry.',
  missing_title: 'Title is required before saving.',
  save_failed: 'Could not save changes. Please try again.',
  // S6-F4: tag resolution errors from upsert_article_tags RPC
  unknown_tags: 'One or more tag slugs were not found. Check Tags admin and retry.',
  tag_update_failed: 'Tag update failed. Please try again.',
  media_update_failed: 'Media URLs could not be saved. Please try again.',
}

const PUBLISH_WARNINGS: Record<string, string> = {
  fanout_failed:
    'Published, but in-app notifications could not be sent. Check server logs and pending_fanout; you can republish after fixing the issue.',
  push_failed:
    'Published, but mobile/browser push could not be queued. In-app notifications may still have been sent. Check server logs and GET /api/health/push.',
}

const PUBLISH_NOTICES: Record<string, string> = {
  fanout_queued:
    'Published. Recipient list is large — remaining notifications will be delivered by the background job within a few minutes.',
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
  const warningCode = Array.isArray(resolvedSearchParams.warning)
    ? resolvedSearchParams.warning[0]
    : resolvedSearchParams.warning
  const noticeCode = Array.isArray(resolvedSearchParams.notice)
    ? resolvedSearchParams.notice[0]
    : resolvedSearchParams.notice
  const db = createAdminClient()

  const [articleResult, tagsResult, mediaResult] = await Promise.all([
    // S3-F2: explicit column list — avoids serializing search_vector (binary tsvector blob)
    db
      .from('articles')
      .select('id, slug, title, excerpt, content_markdown, content_stream, source_url, hero_thumb_url, hero_alt_text, tag_slugs, status, published_at')
      .eq('id', id)
      .single(),
    db
      .from('tags')
      .select('id, slug, label, dimension, is_official')
      .eq('is_official', true)
      .in('dimension', ['format', 'domain', 'subtopic'])
      .order('dimension', { ascending: true, nullsFirst: false })
      .order('label', { ascending: true }),
    db
      .from('article_media')
      .select('url')
      .eq('article_id', id)
      .eq('origin', 'manual')
      .eq('kind', 'image')
      .order('sort_order', { ascending: true }),
  ])

  const article = articleResult.data

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
    media_urls:       (mediaResult.data ?? []).map((row) => row.url as string).filter(Boolean),
  }

  return (
    <ArticleFormShell
      title="Edit Nugget"
      description={article.title as string}
      statusLabel={article.status as string}
      statusTone={isPublished ? 'published' : 'draft'}
      liveHref={isPublished ? `/nuggets/${id}/${article.slug as string}` : undefined}
      errorMessage={errorCode ? PUBLISH_ERRORS[errorCode] ?? PUBLISH_ERRORS.publish_validation_failed : undefined}
      warningMessage={
        warningCode ? PUBLISH_WARNINGS[warningCode] ?? `Warning: ${warningCode}` : undefined
      }
      noticeMessage={noticeCode ? PUBLISH_NOTICES[noticeCode] ?? `Notice: ${noticeCode}` : undefined}
    >
      <form id="article-edit-form" action={updateArticleAction}>
        <ArticleFormFields defaults={defaults} tags={(tagsResult.data ?? []) as unknown as TagSummary[]} />
      </form>

      <div className="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border border-border bg-surface/95 px-4 py-3 shadow-panel backdrop-blur">
        <div className="flex items-center gap-2">
          {isPublished ? (
            <UnpublishButton id={id} />
          ) : (
            <form action={publishArticleAction} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={id} />
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  name="push_notify_immediately"
                  className="size-4 rounded border-border"
                />
                Send push immediately (skip digest)
              </label>
              <button
                type="submit"
                className="rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-inverse transition-colors hover:bg-success-hover"
              >
                Publish Nugget
              </button>
            </form>
          )}
          <DeleteArticleButton id={id} />
        </div>

        <button
          type="submit"
          form="article-edit-form"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          Save Changes
        </button>
      </div>
    </ArticleFormShell>
  )
}
