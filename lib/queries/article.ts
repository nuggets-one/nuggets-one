import { getPublicClient } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import type { ArticleDetail, ContentStream } from '@/types/article'

export type SuggestionRow = {
  id: string
  slug: string
  title: string
  content_stream: ContentStream
}

/** PMF cap — `docs/NUGGETS_V2_BLUEPRINT.md` §6.2a · `docs/NUGGETS_V2_PRODUCT_BEHAVIOR_AND_UI.md` §11 */
export const SEARCH_SUGGEST_ROW_CAP = 8

export async function suggestArticles({
  q,
  stream,
  limit = SEARCH_SUGGEST_ROW_CAP,
}: {
  q: string
  stream: ContentStream
  limit?: number
}): Promise<SuggestionRow[]> {
  if (!q || q.trim().length < 2) return []

  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('articles')
    .select('id, slug, title, content_stream')
    .eq('status', 'published')
    .eq('content_stream', stream)
    .textSearch('search_vector', `${q.trim()}:*`, {
      type: 'plain',
      config: 'english',
    })
    .limit(Math.min(limit, SEARCH_SUGGEST_ROW_CAP))

  if (error || !data) {
    console.error('suggestArticles error:', error?.message)
    return []
  }
  return data as SuggestionRow[]
}

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
  const supabase = getPublicClient()

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
  type ArticleWithTagJoin = Omit<ArticleDetail, 'tags'> & {
    tags?: Array<{ tag: ArticleDetail['tags'][number] | null }>
  }
  const raw = data as unknown as ArticleWithTagJoin
  const tags = (raw.tags ?? [])
    .map((entry) => entry.tag)
    .filter(Boolean)

  return {
    ...raw,
    tags,
  } as unknown as ArticleDetail
}

/**
 * Lightweight fetch for generateMetadata — title, excerpt, OG image only.
 * No content_markdown, no tag joins.
 */
export async function getArticleMeta(id: string): Promise<{
  title: string
  excerpt: string | null
  hero_thumb_url: string | null
  slug: string
} | null> {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('articles')
    .select('title, excerpt, hero_thumb_url, slug')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error || !data) return null
  return data
}

/**
 * Lightweight slug lookup by article id — used by notification panel
 * to build the /nuggets/[id]/[slug] navigation URL.
 */
export async function getArticleSlugById(
  id: string
): Promise<{ id: string; slug: string } | null> {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('articles')
    .select('id, slug')
    .eq('id', id)
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}

/**
 * Resolve a slug to its canonical id.
 * Used by the detail route to check if a slug redirect is needed.
 * Returns null if no published article has this slug.
 */
export async function getArticleIdBySlug(
  slug: string
): Promise<{ id: string; currentSlug: string } | null> {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('articles')
    .select('id, slug')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !data) return null

  const row = data as unknown as { id: string; slug: string }
  return { id: row.id, currentSlug: row.slug }
}
