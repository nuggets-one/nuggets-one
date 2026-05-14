'use server'

import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateArticle, revalidateOfficialTags } from '@/lib/cache'
import { generateArticleSlug, slugify } from '@shared/slug'
import { resolveCardPreview } from '@shared/article-preview'
import { fanOutOnPublish } from '@/lib/notifications/fan-out'
import { normalizePublishPayload } from '@/lib/validation/publish-article'
import type { ContentStream } from '@/types/article'
import { ZodError } from 'zod'

function isMissingCardPreviewError(message: string): boolean {
  return /card_preview/i.test(message)
}

function withoutCardPreview<T extends { card_preview?: unknown }>(payload: T): Omit<T, 'card_preview'> {
  const copy = { ...payload }
  delete (copy as { card_preview?: unknown }).card_preview
  return copy
}

type AdminDb = ReturnType<typeof createAdminClient>

async function curatorDisplayNameForAdminUser(
  db: AdminDb,
  userId: string
): Promise<string | null> {
  const { data } = await db.from('profiles').select('display_name').eq('id', userId).maybeSingle()
  const d = data?.display_name
  return typeof d === 'string' && d.trim() ? d.trim() : null
}

function asString(value: FormDataEntryValue): string {
  return typeof value === 'string' ? value : ''
}

function parseTagSlugs(formData: FormData): string[] {
  const rawValues = formData
    .getAll('tag_slugs')
    .map(asString)
    .flatMap((value) => value.split(','))

  return [...new Set(rawValues.map((tag) => tag.trim().toLowerCase()).filter(Boolean))]
}

function parseMediaUrls(formData: FormData): string[] {
  const urls = formData
    .getAll('media_urls')
    .map(asString)
    .flatMap((value) => value.split(/[\s,]+/))
    .map((url) => url.trim())
    .filter(Boolean)
    .filter((url) => {
      try {
        const parsed = new URL(url)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      } catch {
        return false
      }
    })

  return [...new Set(urls)]
}

async function syncManualImageMedia(db: AdminDb, articleId: string, urls: string[], requestedHeroUrl: string | null) {
  const { error: deleteError } = await db
    .from('article_media')
    .delete()
    .eq('article_id', articleId)
    .eq('origin', 'manual')
    .eq('kind', 'image')

  if (deleteError) return deleteError

  if (urls.length === 0) {
    const { error: clearHeroError } = await db
      .from('articles')
      .update({
        hero_media_id: null,
        hero_media_kind: null,
        hero_video_id: null,
        hero_thumb_url: null,
      })
      .eq('id', articleId)
    return clearHeroError
  }

  const { data: insertedMedia, error: insertError } = await db
    .from('article_media')
    .insert(
      urls.map((url, index) => ({
        article_id: articleId,
        kind: 'image',
        url,
        sort_order: index,
        origin: 'manual',
        hero_thumb_url: url,
      }))
    )
    .select('id, url, hero_thumb_url, sort_order')

  if (insertError) return insertError

  const orderedMedia = (insertedMedia ?? []).sort((a, b) => a.sort_order - b.sort_order)
  const heroMedia = orderedMedia.find((media) => media.url === requestedHeroUrl) ?? orderedMedia[0]
  if (!heroMedia) return null

  const { error: heroError } = await db
    .from('articles')
    .update({
      hero_media_id: heroMedia.id,
      hero_media_kind: 'image',
      hero_video_id: null,
      hero_thumb_url: heroMedia.hero_thumb_url ?? heroMedia.url,
    })
    .eq('id', articleId)

  return heroError
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  // S6-F2: redirect to / (not /login) — consistent with admin layout behavior
  if (error || !user || user.app_metadata?.is_admin !== true) {
    redirect('/')
  }
  return user
}

export async function createArticleAction(formData: FormData) {
  const user = await requireAdmin()
  const db = createAdminClient()

  const title = String(formData.get('title') ?? '').trim()
  const excerpt = (formData.get('excerpt') as string | null)?.trim() || null
  const content_markdown = (formData.get('content_markdown') as string | null)?.trim() || null
  const content_stream = (formData.get('content_stream') as ContentStream) ?? 'standard'
  const source_url = (formData.get('source_url') as string | null)?.trim() || null
  const hero_thumb_url = (formData.get('hero_thumb_url') as string | null)?.trim() || null
  const hero_alt_text = (formData.get('hero_alt_text') as string | null)?.trim() || null
  const tag_slugs = parseTagSlugs(formData)
  const media_urls = parseMediaUrls(formData)
  const card_preview = resolveCardPreview({ content_markdown, excerpt })

  if (!title) {
    redirect('/admin/articles/new?error=missing_title')
  }

  const id = crypto.randomUUID()
  const slug = generateArticleSlug(title, id)

  const curator_display_name = await curatorDisplayNameForAdminUser(db, user.id)

  // S6-F4: insert with empty tag_slugs; RPC populates article_tags and recomputes the array
  const insertPayload = {
    id,
    slug,
    title,
    excerpt,
    card_preview,
    content_markdown,
    content_stream,
    source_url,
    hero_thumb_url,
    hero_alt_text,
    tag_slugs: [],
    created_by: user.id,
    curator_display_name,
    status: 'draft',
  }

  let { error } = await db.from('articles').insert(insertPayload)
  if (error && isMissingCardPreviewError(error.message)) {
    const legacyInsertPayload = withoutCardPreview(insertPayload)
    ;({ error } = await db.from('articles').insert(legacyInsertPayload))
  }

  if (error) {
    redirect('/admin/articles/new?error=create_failed')
  }

  if (tag_slugs.length > 0) {
    const { error: tagError } = await db.rpc('upsert_article_tags', {
      p_article_id: id,
      p_tag_slugs: tag_slugs,
    })
    if (tagError) {
      // Clean up orphaned article if tag resolution fails
      await db.from('articles').delete().eq('id', id)
      const code = tagError.message.includes('unknown_tag_slugs') ? 'unknown_tags' : 'tag_update_failed'
      redirect(`/admin/articles/new?error=${encodeURIComponent(code)}`)
    }
  }

  const mediaError = await syncManualImageMedia(db, id, media_urls, hero_thumb_url)
  if (mediaError) {
    await db.from('articles').delete().eq('id', id)
    redirect('/admin/articles/new?error=media_update_failed')
  }

  revalidateArticle(id)
  redirect(`/admin/articles/${id}`)
}

export async function updateArticleAction(formData: FormData) {
  const user = await requireAdmin()
  const db = createAdminClient()

  const id = String(formData.get('id') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const excerpt = (formData.get('excerpt') as string | null)?.trim() || null
  const content_markdown = (formData.get('content_markdown') as string | null)?.trim() || null
  const content_stream = (formData.get('content_stream') as ContentStream) ?? 'standard'
  const source_url = (formData.get('source_url') as string | null)?.trim() || null
  const hero_thumb_url = (formData.get('hero_thumb_url') as string | null)?.trim() || null
  const hero_alt_text = (formData.get('hero_alt_text') as string | null)?.trim() || null
  const tag_slugs = parseTagSlugs(formData)
  const media_urls = parseMediaUrls(formData)
  const card_preview = resolveCardPreview({ content_markdown, excerpt })

  if (!id) {
    redirect('/admin/articles')
  }
  if (!title) {
    redirect(`/admin/articles/${id}?error=missing_title`)
  }

  // Blueprint §2.a: slug regenerated on every save (title changes → new slug → 301 from old)
  const slug = generateArticleSlug(title, id)

  const curator_display_name = await curatorDisplayNameForAdminUser(db, user.id)

  // S6-F4: tag_slugs excluded from direct update; RPC recomputes from article_tags
  const updatePayload = {
    slug,
    title,
    excerpt,
    card_preview,
    content_markdown,
    content_stream,
    source_url,
    hero_thumb_url,
    hero_alt_text,
    curator_display_name,
  }

  let { error } = await db.from('articles').update(updatePayload).eq('id', id)
  if (error && isMissingCardPreviewError(error.message)) {
    const legacyUpdatePayload = withoutCardPreview(updatePayload)
    ;({ error } = await db.from('articles').update(legacyUpdatePayload).eq('id', id))
  }

  if (error) {
    redirect(`/admin/articles/${id}?error=save_failed`)
  }

  // S6-F4: article_tags is canonical; upsert_article_tags atomically replaces join rows
  // and recomputes articles.tag_slugs from the join table (admin CLAUDE.md SQL pattern)
  const { error: tagError } = await db.rpc('upsert_article_tags', {
    p_article_id: id,
    p_tag_slugs: tag_slugs,
  })
  if (tagError) {
    const code = tagError.message.includes('unknown_tag_slugs') ? 'unknown_tags' : 'tag_update_failed'
    redirect(`/admin/articles/${id}?error=${encodeURIComponent(code)}`)
  }

  const mediaError = await syncManualImageMedia(db, id, media_urls, hero_thumb_url)
  if (mediaError) {
    redirect(`/admin/articles/${id}?error=media_update_failed`)
  }

  revalidateArticle(id)
  redirect(`/admin/articles/${id}`)
}

export async function publishArticleAction(formData: FormData) {
  const user = await requireAdmin()
  const db = createAdminClient()

  const id = formData.get('id') as string
  if (!id) throw new Error('Missing article id')

  const { data: existing } = await db
    .from('articles')
    .select('published_at, content_stream, title, content_markdown, source_url, excerpt')
    .eq('id', id)
    .single()

  if (!existing) throw new Error('Article not found')

  let publishPayload: ReturnType<typeof normalizePublishPayload>
  try {
    // Audit S6-F3 decision: enforce full publish contract from server-side source of truth.
    publishPayload = normalizePublishPayload({
      title: existing.title as string,
      content_markdown: existing.content_markdown as string | null,
      content_stream: existing.content_stream as string | null,
      source_url: existing.source_url as string | null,
      excerpt: existing.excerpt as string | null,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      const code = error.issues[0]?.message ?? 'publish_validation_failed'
      redirect(`/admin/articles/${id}?error=${encodeURIComponent(code)}`)
    }
    throw error
  }

  // Blueprint §15.1: published_at set once on first publish — never overwritten
  const published_at = (existing?.published_at as string | null) ?? new Date().toISOString()

  const curator_display_name = await curatorDisplayNameForAdminUser(db, user.id)

  const publishUpdatePayload = {
    status: 'published',
    published_at,
    excerpt: publishPayload.excerpt,
    card_preview: publishPayload.card_preview,
    curator_display_name,
  }

  let { error } = await db.from('articles').update(publishUpdatePayload).eq('id', id)
  if (error && isMissingCardPreviewError(error.message)) {
    const legacyPublishUpdatePayload = withoutCardPreview(publishUpdatePayload)
    ;({ error } = await db.from('articles').update(legacyPublishUpdatePayload).eq('id', id))
  }

  if (error) throw new Error(error.message)

  revalidateArticle(id)

  if (publishPayload.content_stream && publishPayload.title) {
    try {
      const fanResult = await fanOutOnPublish({
        articleId: id,
        stream: publishPayload.content_stream as 'standard' | 'pulse',
        title: publishPayload.title,
      })
      const suffix = fanResult.mode === 'queued' ? '?notice=fanout_queued' : ''
      redirect(`/admin/articles/${id}${suffix}`)
    } catch (fanOutError) {
      console.error('[publishArticleAction] fan-out error:', fanOutError)
      redirect(`/admin/articles/${id}?warning=fanout_failed`)
    }
  }

  redirect(`/admin/articles/${id}`)
}

export async function unpublishArticleAction(formData: FormData) {
  await requireAdmin()
  const db = createAdminClient()

  const id = formData.get('id') as string
  if (!id) throw new Error('Missing article id')

  const { error } = await db.from('articles').update({ status: 'draft' }).eq('id', id)

  if (error) throw new Error(error.message)

  revalidateArticle(id)
  redirect(`/admin/articles/${id}`)
}

export async function deleteArticleAction(formData: FormData) {
  await requireAdmin()
  const db = createAdminClient()

  const id = formData.get('id') as string
  if (!id) throw new Error('Missing article id')

  const { error } = await db.from('articles').delete().eq('id', id)

  if (error) throw new Error(error.message)

  revalidateArticle(id)
  redirect('/admin/articles')
}

export async function createTagAction(formData: FormData) {
  await requireAdmin()
  const db = createAdminClient()

  const label = (formData.get('label') as string).trim()
  const dimension = (formData.get('dimension') as string | null)?.trim() || null
  const is_official = formData.get('is_official') === 'on'

  if (!label) throw new Error('Label is required')

  // S6-F5: use shared slugify — same function as ETL and article slug generation
  const slug = slugify(label)

  const { error } = await db.from('tags').insert({
    slug,
    label,
    dimension: dimension || null,
    is_official,
  })

  if (error) throw new Error(error.message)

  revalidateOfficialTags()
  redirect('/admin/tags')
}
