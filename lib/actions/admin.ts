'use server'

import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateArticle, revalidateOfficialTags } from '@/lib/cache'
import { generateArticleSlug, slugify } from '@shared/slug'
import { resolveCardPreview } from '@shared/article-preview'
import { resolveArticleHeroFields } from '@/lib/admin/resolve-article-hero'
import { parseAdminMediaUrlList } from '@/lib/ui/parse-admin-media-urls'
import {
  articleIdsForTag,
  recomputeTagSlugsForArticles,
} from '@/lib/admin/recompute-article-tag-slugs'
import { syncArticleTags } from '@/lib/admin/sync-article-tags'
import { fanOutOnPublish } from '@/lib/notifications/fan-out'
import { normalizePublishPayload } from '@/lib/validation/publish-article'
import { sanitizeDeleteRedirectTo } from '@/lib/auth/can-manage-article'
import type { ContentStream, TagDimension } from '@/types/article'
import { TAG_DIMENSIONS } from '@/types/article'
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
  const blob = formData.getAll('media_urls').map(asString).join('\n')
  return parseAdminMediaUrlList(blob)
}

async function syncManualImageMedia(
  db: AdminDb,
  articleId: string,
  urls: string[],
  requestedHeroUrl: string | null,
  options?: { preserveYouTubeHero?: boolean }
) {
  const { error: deleteError } = await db
    .from('article_media')
    .delete()
    .eq('article_id', articleId)
    .eq('origin', 'manual')
    .eq('kind', 'image')

  if (deleteError) return deleteError

  if (urls.length === 0) {
    const { data: existing } = await db
      .from('articles')
      .select('hero_media_kind')
      .eq('id', articleId)
      .maybeSingle()
    if (existing?.hero_media_kind === 'youtube') {
      return null
    }
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

  if (options?.preserveYouTubeHero) {
    return null
  }

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

async function requireArticleManager(articleId: string) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/')
  }

  if (user.app_metadata?.is_admin === true) {
    return user
  }

  const db = createAdminClient()
  const { data } = await db
    .from('articles')
    .select('created_by')
    .eq('id', articleId)
    .maybeSingle()

  if (!data || data.created_by !== user.id) {
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
  const heroFields = resolveArticleHeroFields({ source_url, hero_thumb_url, media_urls })

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
    hero_thumb_url: heroFields.hero_thumb_url,
    hero_alt_text,
    hero_media_kind: heroFields.hero_media_kind,
    hero_video_id: heroFields.hero_video_id,
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
    const tagResult = await syncArticleTags(db, id, tag_slugs)
    if (!tagResult.ok) {
      await db.from('articles').delete().eq('id', id)
      redirect(`/admin/articles/new?error=${encodeURIComponent(tagResult.code)}`)
    }
  }

  const mediaError = await syncManualImageMedia(
    db,
    id,
    heroFields.imageMediaUrls,
    heroFields.hero_media_kind === 'image' ? heroFields.hero_thumb_url : null,
    { preserveYouTubeHero: heroFields.hero_media_kind === 'youtube' }
  )
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
  const heroFields = resolveArticleHeroFields({ source_url, hero_thumb_url, media_urls })

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
    hero_thumb_url: heroFields.hero_thumb_url,
    hero_alt_text,
    hero_media_kind: heroFields.hero_media_kind,
    hero_video_id: heroFields.hero_video_id,
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

  const tagResult = await syncArticleTags(db, id, tag_slugs)
  if (!tagResult.ok) {
    redirect(`/admin/articles/${id}?error=${encodeURIComponent(tagResult.code)}`)
  }

  const mediaError = await syncManualImageMedia(
    db,
    id,
    heroFields.imageMediaUrls,
    heroFields.hero_media_kind === 'image' ? heroFields.hero_thumb_url : null,
    { preserveYouTubeHero: heroFields.hero_media_kind === 'youtube' }
  )
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
    .select('published_at, content_stream, title, content_markdown, source_url, excerpt, hero_thumb_url')
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
    const slug = generateArticleSlug(publishPayload.title, id)
    const pushNotifyImmediately = formData.get('push_notify_immediately') === 'on'
    let fanResult: Awaited<ReturnType<typeof fanOutOnPublish>>
    try {
      fanResult = await fanOutOnPublish({
        articleId: id,
        stream: publishPayload.content_stream as ContentStream,
        title: publishPayload.title,
        slug,
        imageUrl: existing.hero_thumb_url as string | null,
        pushNotifyImmediately,
      })
    } catch (fanOutError) {
      console.error('[publishArticleAction] fan-out error:', fanOutError)
      return redirect(`/admin/articles/${id}?warning=fanout_failed`)
    }

    const suffixParts: string[] = []
    if (fanResult.mode === 'queued') suffixParts.push('notice=fanout_queued')
    if (fanResult.pushError) suffixParts.push(`warning=push_failed`)
    const suffix = suffixParts.length > 0 ? `?${suffixParts.join('&')}` : ''
    return redirect(`/admin/articles/${id}${suffix}`)
  }

  return redirect(`/admin/articles/${id}`)
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
  const id = String(formData.get('id') ?? '').trim()
  if (!id) throw new Error('Missing article id')

  await requireArticleManager(id)

  const redirectToRaw = formData.get('redirect_to')
  const redirectTo =
    typeof redirectToRaw === 'string' && redirectToRaw.trim()
      ? sanitizeDeleteRedirectTo(redirectToRaw)
      : '/admin/articles'

  const db = createAdminClient()
  const { error } = await db.from('articles').delete().eq('id', id)

  if (error) throw new Error(error.message)

  revalidateArticle(id)
  redirect(redirectTo)
}

type TagDimensionInput = TagDimension | null

function parseTagDimension(raw: FormDataEntryValue | null): TagDimensionInput {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) return null
  if ((TAG_DIMENSIONS as readonly string[]).includes(value)) return value as TagDimension
  throw new Error('Invalid dimension')
}

function parseTagSlugInput(raw: FormDataEntryValue | null): string {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (!value) throw new Error('Slug is required')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error('Slug must use lowercase letters, numbers, and hyphens only')
  }
  return value
}

export async function createTagAction(formData: FormData) {
  await requireAdmin()
  const db = createAdminClient()

  const label = (formData.get('label') as string).trim()
  const dimension = parseTagDimension(formData.get('dimension'))
  const is_official = formData.get('is_official') === 'on'

  if (!label) throw new Error('Label is required')

  // S6-F5: use shared slugify — same function as ETL and article slug generation
  const slug = slugify(label)

  const { error } = await db.from('tags').insert({
    slug,
    label,
    dimension,
    is_official,
  })

  if (error) throw new Error(error.message)

  revalidateOfficialTags()
  redirect('/admin/tags')
}

export async function updateTagAction(formData: FormData) {
  await requireAdmin()
  const db = createAdminClient()

  const id = String(formData.get('id') ?? '').trim()
  if (!id) throw new Error('Missing tag id')

  const label = (formData.get('label') as string).trim()
  const dimension = parseTagDimension(formData.get('dimension'))
  const is_official = formData.get('is_official') === 'on'
  const nextSlug = parseTagSlugInput(formData.get('slug'))

  if (!label) throw new Error('Label is required')

  const { data: existing, error: fetchError } = await db
    .from('tags')
    .select('id, slug')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) throw new Error(fetchError.message)
  if (!existing) throw new Error('Tag not found')

  const slugChanged = existing.slug !== nextSlug

  const { error } = await db
    .from('tags')
    .update({
      label,
      slug: nextSlug,
      dimension,
      is_official,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  if (slugChanged) {
    const articleIds = await articleIdsForTag(db, id)
    await recomputeTagSlugsForArticles(db, articleIds)
  }

  revalidateOfficialTags()
  redirect(`/admin/tags/${id}?saved=1`)
}

export async function deleteTagAction(formData: FormData) {
  await requireAdmin()
  const db = createAdminClient()

  const id = String(formData.get('id') ?? '').trim()
  if (!id) throw new Error('Missing tag id')

  const articleIds = await articleIdsForTag(db, id)

  const { error } = await db.from('tags').delete().eq('id', id)
  if (error) throw new Error(error.message)

  await recomputeTagSlugsForArticles(db, articleIds)

  revalidateOfficialTags()
  redirect('/admin/tags')
}
