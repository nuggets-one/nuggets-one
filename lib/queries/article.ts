import { getPublicClient } from '@/lib/supabase/public'
import {
  applyFeedScopeFilter,
  applyVisibleStreamFilter,
  effectiveFeedScope,
  isFeedAllStream,
  resolveEffectiveContentStream,
  scopeToRpcParam,
} from '@/lib/feed/scope'
import type { FeedScope } from '@/lib/feed/scope'
import { isGlobalSearchEnabled } from '@/lib/search/flags'
import { notFound } from 'next/navigation'
import {
  normalizeHeroMediaKind,
  type ArticleDetail,
  type ContentStream,
  type FeedStream,
  type RelatedArticlePreview,
} from '@/types/article'

export type SuggestionRow = {
  id: string
  slug: string
  title: string
  content_stream: ContentStream
  published_at: string | null
}

async function withSuggestionPublishedAt(
  supabase: ReturnType<typeof getPublicClient>,
  rows: SuggestionRow[]
): Promise<SuggestionRow[]> {
  const missingDateIds = rows
    .filter((row) => row.published_at == null)
    .map((row) => row.id)

  if (missingDateIds.length === 0) return rows

  // Non-empty tuple required — `.in('id', string[])` infers `never` rows when length is not narrowed.
  const ids = missingDateIds as [string, ...string[]]

  const { data, error } = await supabase
    .from('articles')
    .select('id, published_at')
    .in('id', ids)
    .eq('status', 'published')

  if (error || !data) return rows

  const dateRows = data as { id: string; published_at: string | null }[]
  const publishedAtById = new Map<string, string | null>(
    dateRows.map((row) => [row.id, row.published_at])
  )

  return rows.map((row) => ({
    ...row,
    published_at: row.published_at ?? publishedAtById.get(row.id) ?? null,
  }))
}

type RpcClient = {
  rpc: (
    fn: string,
    params?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

function isMissingSuggestRpcFunctionError(message: string): boolean {
  return (
    /could not find the function/i.test(message) &&
    /search_suggestions_ranked/i.test(message)
  )
}

/** PMF cap — `docs/NUGGETS_V2_BLUEPRINT.md` §6.2a · `docs/NUGGETS_V2_PRODUCT_BEHAVIOR_AND_UI.md` §11 */
export const SEARCH_SUGGEST_ROW_CAP = 8

export async function suggestArticles({
  q,
  stream,
  scope,
  limit = SEARCH_SUGGEST_ROW_CAP,
}: {
  q: string
  stream: FeedStream
  scope?: FeedScope
  limit?: number
}): Promise<SuggestionRow[]> {
  if (!q || q.trim().length < 2) return []

  // Global-by-default: suggestions search across every stream/scope so users
  // discover nuggets regardless of the section they are currently viewing.
  const global = isGlobalSearchEnabled()

  const supabase = getPublicClient()
  const rpcClient = supabase as unknown as RpcClient
  const effectiveScope = global ? undefined : effectiveFeedScope(stream, scope)
  const effectiveStream = global ? 'all' : resolveEffectiveContentStream(stream, scope)
  const rpcScope = global ? null : scopeToRpcParam(stream, effectiveScope)

  const { data, error } = await rpcClient.rpc('search_suggestions_ranked', {
    p_stream: effectiveStream,
    p_q: q.trim(),
    p_limit: Math.min(limit, SEARCH_SUGGEST_ROW_CAP),
    p_scope: rpcScope,
  })

  if (error) {
    if (isMissingSuggestRpcFunctionError(error.message)) {
      let query = supabase
        .from('articles')
        .select('id, slug, title, content_stream, published_at')
        .eq('status', 'published')

      if (!global) {
        query = applyFeedScopeFilter(query, stream, effectiveScope)

        if (!isFeedAllStream(effectiveStream)) {
          query = applyVisibleStreamFilter(query, effectiveStream)
        }
      }

      query = query
        .textSearch('search_vector', q.trim(), {
          type: 'websearch',
          config: 'english',
        })
        .order('published_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(Math.min(limit, SEARCH_SUGGEST_ROW_CAP))

      const { data: fallbackData, error: fallbackError } = await query

      if (fallbackError || !fallbackData) {
        console.error('suggestArticles fallback error:', fallbackError?.message)
        return []
      }

      return withSuggestionPublishedAt(supabase, fallbackData as SuggestionRow[])
    }
    console.error('suggestArticles error:', error.message)
    return []
  }

  if (!data) {
    console.error('suggestArticles error: empty RPC response data')
    return []
  }

  return withSuggestionPublishedAt(supabase, data as SuggestionRow[])
}

const DETAIL_SELECT = `
  id,
  created_by,
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
    hero_media_kind: normalizeHeroMediaKind(raw.hero_media_kind),
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
 * Resolve the canonical slug for a published article by id.
 * Returns notFound() when the article is missing or not publicly readable.
 */
export async function getCanonicalArticleSlug(id: string): Promise<string> {
  const meta = await getArticleMeta(id)

  if (!meta) {
    notFound()
  }

  return meta.slug
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

export async function getRelatedArticles({
  articleId,
  stream,
  tagSlugs,
  limit = 3,
}: {
  articleId: string
  stream: ContentStream
  tagSlugs: string[]
  limit?: number
}): Promise<RelatedArticlePreview[]> {
  const supabase = getPublicClient()
  const cappedLimit = Math.min(Math.max(limit, 1), 6)

  const baseQuery = applyVisibleStreamFilter(
    supabase
      .from('articles')
      .select('id, slug, title, excerpt, published_at, source_url')
      .eq('status', 'published'),
    stream
  )
    .neq('id', articleId)
    .order('published_at', { ascending: false })
    .limit(cappedLimit)

  if (tagSlugs.length === 0) {
    const { data, error } = await baseQuery
    if (error || !data) return []
    return data as RelatedArticlePreview[]
  }

  const { data: tagMatched, error: tagMatchError } = await applyVisibleStreamFilter(
    supabase
      .from('articles')
      .select('id, slug, title, excerpt, published_at, source_url')
      .eq('status', 'published'),
    stream
  )
    .neq('id', articleId)
    .overlaps('tag_slugs', tagSlugs)
    .order('published_at', { ascending: false })
    .limit(cappedLimit)

  if (!tagMatchError && tagMatched && tagMatched.length > 0) {
    return tagMatched as RelatedArticlePreview[]
  }

  const { data: fallbackData, error: fallbackError } = await baseQuery
  if (fallbackError || !fallbackData) return []
  return fallbackData as RelatedArticlePreview[]
}
