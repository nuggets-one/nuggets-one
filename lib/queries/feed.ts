import { getPublicClient } from '@/lib/supabase/public'
import { normalizeCuratorDisplayNameOnRows } from '@/lib/queries/normalize-curator-display-name'
import { attachTagLabelsToRows } from '@/lib/queries/card-tag-labels'
import type { SupabaseLike } from '@/lib/queries/card-tag-labels'
import { attachCardPreviewHtml } from '@/lib/ui/card-preview-markdown'
import { isGalleryImageUrl } from '@/lib/ui/gallery-image-url'
import {
  normalizeHeroMediaKind,
  type ArticleCardProps,
  type CardImage,
  type FeedPage,
  type FeedPageParams,
  type FeedCursor,
  type ContentStream,
} from '@/types/article'

type ArticleRowWithLabels = Omit<ArticleCardProps, 'cardPreviewHtml'>
type ArticleRowWithoutLabels = Omit<ArticleCardProps, 'cardPreviewHtml' | 'tag_labels'>
type RawArticleRow = Omit<ArticleRowWithoutLabels, 'images'>
type SearchRpcRow = RawArticleRow & { search_rank: number }
type TaggableRow = Record<string, unknown> & { tag_slugs: string[] }
type RpcClient = {
  rpc: (
    fn: string,
    params?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

// Phase 14: cap at 4 images per card (2x2 grid + "+N" overlay if more exist).
const MAX_IMAGES_PER_CARD = 4

const FEED_SELECT = `
  id,
  slug,
  title,
  card_preview,
  content_stream,
  published_at,
  hero_thumb_url,
  hero_alt_text,
  hero_media_kind,
  hero_video_id,
  tag_slugs,
  source_url,
  curator_display_name
`.trim()

const LEGACY_FEED_SELECT = `
  id,
  slug,
  title,
  card_preview:excerpt,
  content_stream,
  published_at,
  hero_thumb_url,
  hero_alt_text,
  hero_media_kind,
  hero_video_id,
  tag_slugs,
  source_url,
  curator_display_name
`.trim()

const FEED_SELECT_NO_CURATOR = `
  id,
  slug,
  title,
  card_preview,
  content_stream,
  published_at,
  hero_thumb_url,
  hero_alt_text,
  hero_media_kind,
  hero_video_id,
  tag_slugs,
  source_url
`.trim()

const LEGACY_FEED_SELECT_NO_CURATOR = `
  id,
  slug,
  title,
  card_preview:excerpt,
  content_stream,
  published_at,
  hero_thumb_url,
  hero_alt_text,
  hero_media_kind,
  hero_video_id,
  tag_slugs,
  source_url
`.trim()

// Never add content_markdown to FEED_SELECT.
// Never add search_vector to FEED_SELECT.
// These fields widen the RSC payload — keep cards lean.

function isMissingCardPreviewError(message: string): boolean {
  return /card_preview/i.test(message)
}

function isMissingCuratorDisplayNameColumnError(message: string): boolean {
  return /curator_display_name/i.test(message) && /does not exist/i.test(message)
}

function isMissingSearchRpcFunctionError(message: string): boolean {
  return (
    /could not find the function/i.test(message) &&
    /search_articles_ranked/i.test(message)
  )
}

type FeedArticleSelectResult = {
  data: unknown
  error: { message: string } | null
}

async function runFeedArticleSelectChain(
  runQuery: (selectClause: string) => Promise<FeedArticleSelectResult>
): Promise<FeedArticleSelectResult> {
  let result = await runQuery(FEED_SELECT)
  if (result.error && isMissingCuratorDisplayNameColumnError(result.error.message)) {
    result = await runQuery(FEED_SELECT_NO_CURATOR)
  }
  if (result.error && isMissingCardPreviewError(result.error.message)) {
    result = await runQuery(LEGACY_FEED_SELECT)
    if (result.error && isMissingCuratorDisplayNameColumnError(result.error.message)) {
      result = await runQuery(LEGACY_FEED_SELECT_NO_CURATOR)
    }
  }
  return result
}

function normalizeCuratorOnRows(rows: Record<string, unknown>[]): RawArticleRow[] {
  return normalizeCuratorDisplayNameOnRows(rows) as unknown as RawArticleRow[]
}

export async function getFeedPage({
  stream,
  tags = [],
  q = '',
  cursor,
  limit = 24,
}: FeedPageParams): Promise<FeedPage> {
  const supabase = getPublicClient()

  // Branch: full-text search vs cursor pagination
  // Search uses ranked RPC pagination (rank DESC, published_at DESC, id DESC).
  // Non-search feed uses keyset on (published_at DESC, id DESC).

  if (q.trim()) {
    return getFeedPageBySearch({ supabase, stream, tags, q, cursor, limit })
  }

  const totalCountPromise = getFeedTotalCount({ supabase, stream, tags, q: '' })
  const page = await getFeedPageByCursor({ supabase, stream, tags, cursor, limit })
  return { ...page, totalCount: await totalCountPromise }
}

async function getFeedTotalCount({
  supabase,
  stream,
  tags,
  q,
}: {
  supabase: ReturnType<typeof getPublicClient>
  stream: ContentStream
  tags: string[]
  q: string
}): Promise<number> {
  let query = supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .eq('content_stream', stream)

  if (tags.length > 0) {
    query = query.contains('tag_slugs', tags)
  }

  if (q.trim()) {
    query = query.textSearch('search_vector', q, {
      type: 'websearch',
      config: 'english',
    })
  }

  const { count, error } = await query
  if (error) {
    throw new Error(`getFeedTotalCount error: ${error.message}`)
  }

  return count ?? 0
}

async function getFeedPageByCursor({
  supabase,
  stream,
  tags,
  cursor,
  limit,
}: {
  supabase: ReturnType<typeof getPublicClient>
  stream: ContentStream
  tags: string[]
  cursor?: FeedCursor
  limit: number
}): Promise<FeedPage> {
  async function runQuery(selectClause: string) {
    let query = supabase
      .from('articles')
      .select(selectClause)
      .eq('status', 'published')
      .eq('content_stream', stream)
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit)

    if (tags.length > 0) {
      query = query.contains('tag_slugs', tags)
    }

    if (cursor) {
      query = query.or(
        `published_at.lt.${cursor.published_at},` +
        `and(published_at.eq.${cursor.published_at},id.lt.${cursor.id})`
      )
    }

    return query
  }

  const { data, error } = await runFeedArticleSelectChain(runQuery)

  if (error) {
    throw new Error(`getFeedPage error: ${error.message}`)
  }

  // TODO: replace with generated DB types in later PR
  const rawRows = normalizeCuratorOnRows((data ?? []) as unknown as Record<string, unknown>[])
  const rowsWithImages = await attachImagesToRows(supabase, rawRows)
  const rows = await attachTagLabelsToRows(
    supabase as unknown as SupabaseLike,
    rowsWithImages as unknown as TaggableRow[]
  ) as ArticleRowWithLabels[]
  const articles = await attachCardPreviewHtml(rows)

  const nextCursor: FeedCursor | null =
    articles.length === limit
      ? {
          published_at: articles[articles.length - 1].published_at,
          id: articles[articles.length - 1].id,
        }
      : null

  return { articles, nextCursor, stream }
}

async function getFeedPageBySearch({
  supabase,
  stream,
  tags,
  q,
  cursor,
  limit,
}: {
  supabase: ReturnType<typeof getPublicClient>
  stream: ContentStream
  tags: string[]
  q: string
  cursor?: FeedCursor
  limit: number
}): Promise<FeedPage> {
  const safeCursorRank = typeof cursor?.rank === 'number' ? cursor.rank : null
  const safeCursorPublishedAt = cursor?.published_at ?? null
  const safeCursorId = cursor?.id ?? null
  const rpcClient = supabase as unknown as RpcClient

  const { data, error } = await rpcClient.rpc('search_articles_ranked', {
    p_stream: stream,
    p_tags: tags,
    p_q: q,
    p_limit: limit,
    p_cursor_rank: safeCursorRank,
    p_cursor_published_at: safeCursorPublishedAt,
    p_cursor_id: safeCursorId,
  })

  if (error) {
    if (isMissingSearchRpcFunctionError(error.message)) {
      console.warn(
        'search_articles_ranked RPC missing in schema cache; using legacy search fallback.'
      )
      return getFeedPageBySearchLegacy({ supabase, stream, tags, q, cursor, limit })
    }
    throw new Error(`getFeedPageBySearch error: ${error.message}`)
  }

  const rpcRows = (data ?? []) as unknown as SearchRpcRow[]
  const strippedRows = rpcRows.map((row) => {
    const next = { ...row } as RawArticleRow & { search_rank?: number }
    delete next.search_rank
    return next
  })
  const rawRows = normalizeCuratorOnRows(strippedRows as unknown as Record<string, unknown>[])
  const rowsWithImages = await attachImagesToRows(supabase, rawRows)
  const rows = await attachTagLabelsToRows(
    supabase as unknown as SupabaseLike,
    rowsWithImages as unknown as TaggableRow[]
  ) as ArticleRowWithLabels[]
  const articles = await attachCardPreviewHtml(rows)
  const lastRow = rpcRows[rpcRows.length - 1]

  return {
    articles,
    nextCursor: rpcRows.length === limit && lastRow
      ? {
          published_at: lastRow.published_at,
          id: lastRow.id,
          rank: Number(lastRow.search_rank),
        }
      : null,
    stream,
  }
}

async function getFeedPageBySearchLegacy({
  supabase,
  stream,
  tags,
  q,
  cursor,
  limit,
}: {
  supabase: ReturnType<typeof getPublicClient>
  stream: ContentStream
  tags: string[]
  q: string
  cursor?: FeedCursor
  limit: number
}): Promise<FeedPage> {
  async function runQuery(selectClause: string) {
    let query = supabase
      .from('articles')
      .select(selectClause)
      .eq('status', 'published')
      .eq('content_stream', stream)
      .textSearch('search_vector', q, {
        type: 'websearch',
        config: 'english',
      })
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit)

    if (tags.length > 0) {
      query = query.contains('tag_slugs', tags)
    }

    if (cursor?.published_at && cursor?.id) {
      query = query.or(
        `published_at.lt.${cursor.published_at},` +
        `and(published_at.eq.${cursor.published_at},id.lt.${cursor.id})`
      )
    }

    return query
  }

  const { data, error } = await runFeedArticleSelectChain(runQuery)

  if (error) {
    throw new Error(`getFeedPageBySearchLegacy error: ${error.message}`)
  }

  const rawRows = normalizeCuratorOnRows((data ?? []) as unknown as Record<string, unknown>[])
  const rowsWithImages = await attachImagesToRows(supabase, rawRows)
  const rows = await attachTagLabelsToRows(
    supabase as unknown as SupabaseLike,
    rowsWithImages as unknown as TaggableRow[]
  ) as ArticleRowWithLabels[]
  const articles = await attachCardPreviewHtml(rows)
  const lastRow = articles[articles.length - 1]

  return {
    articles,
    nextCursor: articles.length === limit && lastRow
      ? {
          published_at: lastRow.published_at,
          id: lastRow.id,
        }
      : null,
    stream,
  }
}

/**
 * Phase 14: batch-fetch up to 4 image rows per article from `article_media`,
 * then merge them onto each row as `images`. One query for all article ids,
 * grouped in memory — no N+1.
 *
 * `article_media` has no `alt` column today; we surface `null` and let the
 * card fall back to article-level alt/title in the renderer.
 */
async function attachImagesToRows(
  supabase: ReturnType<typeof getPublicClient>,
  rows: RawArticleRow[]
): Promise<ArticleRowWithoutLabels[]> {
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)
  const { data: mediaRows, error } = await supabase
    .from('article_media')
    .select('article_id, url, sort_order')
    .in('article_id', ids)
    .eq('kind', 'image')
    .order('sort_order', { ascending: true })

  if (error) {
    // Fail open — render single-hero rather than blocking the feed.
    console.warn(`attachImagesToRows: ${error.message}`)
    return rows.map((r) => ({
      ...r,
      images: [],
      image_count: 0,
      hero_media_kind: normalizeHeroMediaKind(r.hero_media_kind),
    }))
  }

  const byArticle = new Map<string, CardImage[]>()
  const countByArticle = new Map<string, number>()
  for (const m of (mediaRows ?? []) as { article_id: string; url: string }[]) {
    if (typeof m.url !== 'string' || !isGalleryImageUrl(m.url)) continue
    countByArticle.set(m.article_id, (countByArticle.get(m.article_id) ?? 0) + 1)
    const list = byArticle.get(m.article_id) ?? []
    if (list.length >= MAX_IMAGES_PER_CARD) continue
    list.push({ url: m.url, alt: null })
    byArticle.set(m.article_id, list)
  }

  return rows.map((r) => ({
    ...r,
    images: byArticle.get(r.id) ?? [],
    image_count: countByArticle.get(r.id) ?? 0,
    hero_media_kind: normalizeHeroMediaKind(r.hero_media_kind),
  }))
}
