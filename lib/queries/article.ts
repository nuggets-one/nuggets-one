import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { ArticleDetail } from '@/types/article'

const DETAIL_SELECT = `
  id,
  slug,
  title,
  excerpt,
  content_markdown,
  content_stream,
  published_at,
  hero_thumb_url,
  hero_alt_text,
  hero_media_kind,
  hero_video_id,
  source_url,
  tag_slugs,
  tags:article_tags(
    tag:tags(
      id,
      slug,
      label,
      dimension,
      is_official
    )
  )
`.trim()

/**
 * Load a single article by UUID id.
 * RLS enforces status = 'published' — drafts return null and trigger notFound().
 * Never load by slug as primary key — slugs change; IDs do not.
 */
export async function getArticleById(
  id: string
): Promise<ArticleDetail> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('articles')
    .select(DETAIL_SELECT)
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  // Flatten nested tag join into TagSummary[]
  // TODO: replace with generated DB types in later PR
  const raw = data as any
  const tags = (raw.tags ?? [])
    .map((entry: any) => entry.tag)
    .filter(Boolean)

  return {
    ...raw,
    tags,
  } as unknown as ArticleDetail
}

/**
 * Resolve a slug to its canonical id.
 * Used by the detail route to check if a slug redirect is needed.
 * Returns null if no published article has this slug.
 */
export async function getArticleIdBySlug(
  slug: string
): Promise<{ id: string; currentSlug: string } | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('articles')
    .select('id, slug')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !data) return null

  return { id: data.id, currentSlug: data.slug }
}
