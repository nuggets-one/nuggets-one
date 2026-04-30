'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateArticle, revalidateOfficialTags } from '@/lib/cache'
import { generateArticleSlug } from '@shared/slug'
import { fanOutOnPublish } from '@/lib/notifications/fan-out'
import type { ContentStream } from '@/types/article'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user || user.app_metadata?.is_admin !== true) {
    redirect('/login')
  }
  return user
}

export async function createArticleAction(formData: FormData) {
  await requireAdmin()
  const db = createAdminClient()

  const title = (formData.get('title') as string).trim()
  const excerpt = (formData.get('excerpt') as string | null)?.trim() || null
  const content_markdown = (formData.get('content_markdown') as string | null)?.trim() || null
  const content_stream = (formData.get('content_stream') as ContentStream) ?? 'standard'
  const source_url = (formData.get('source_url') as string | null)?.trim() || null
  const hero_thumb_url = (formData.get('hero_thumb_url') as string | null)?.trim() || null
  const hero_alt_text = (formData.get('hero_alt_text') as string | null)?.trim() || null
  const tag_slugs_raw = (formData.get('tag_slugs') as string | null)?.trim() || ''
  const tag_slugs = tag_slugs_raw
    ? tag_slugs_raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    : []

  if (!title) throw new Error('Title is required')

  const id = crypto.randomUUID()
  const slug = generateArticleSlug(title, id)

  const { error } = await db.from('articles').insert({
    id,
    slug,
    title,
    excerpt,
    content_markdown,
    content_stream,
    source_url,
    hero_thumb_url,
    hero_alt_text,
    tag_slugs,
    status: 'draft',
  })

  if (error) throw new Error(error.message)

  revalidateArticle(id)
  redirect(`/admin/articles/${id}`)
}

export async function updateArticleAction(formData: FormData) {
  await requireAdmin()
  const db = createAdminClient()

  const id = formData.get('id') as string
  const title = (formData.get('title') as string).trim()
  const excerpt = (formData.get('excerpt') as string | null)?.trim() || null
  const content_markdown = (formData.get('content_markdown') as string | null)?.trim() || null
  const content_stream = (formData.get('content_stream') as ContentStream) ?? 'standard'
  const source_url = (formData.get('source_url') as string | null)?.trim() || null
  const hero_thumb_url = (formData.get('hero_thumb_url') as string | null)?.trim() || null
  const hero_alt_text = (formData.get('hero_alt_text') as string | null)?.trim() || null
  const tag_slugs_raw = (formData.get('tag_slugs') as string | null)?.trim() || ''
  const tag_slugs = tag_slugs_raw
    ? tag_slugs_raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    : []

  if (!title || !id) throw new Error('Missing required fields')

  // Blueprint §2.a: slug regenerated on every save (title changes → new slug → 301 from old)
  const slug = generateArticleSlug(title, id)

  const { error } = await db.from('articles').update({
    slug,
    title,
    excerpt,
    content_markdown,
    content_stream,
    source_url,
    hero_thumb_url,
    hero_alt_text,
    tag_slugs,
  }).eq('id', id)

  if (error) throw new Error(error.message)

  revalidateArticle(id)
  redirect(`/admin/articles/${id}`)
}

export async function publishArticleAction(formData: FormData) {
  await requireAdmin()
  const db = createAdminClient()

  const id = formData.get('id') as string
  if (!id) throw new Error('Missing article id')

  const { data: existing } = await db
    .from('articles')
    .select('published_at, content_stream, title')
    .eq('id', id)
    .single()

  // Blueprint §15.1: published_at set once on first publish — never overwritten
  const published_at = (existing?.published_at as string | null) ?? new Date().toISOString()

  const { error } = await db.from('articles').update({
    status: 'published',
    published_at,
  }).eq('id', id)

  if (error) throw new Error(error.message)

  revalidateArticle(id)

  // Fan-out must never block the publish response
  try {
    if (existing?.content_stream && existing?.title) {
      await fanOutOnPublish({
        articleId: id,
        stream: existing.content_stream as 'standard' | 'pulse',
        title: existing.title,
      })
    }
  } catch (fanOutError) {
    console.error('[publishArticleAction] fan-out error:', fanOutError)
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

  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

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
