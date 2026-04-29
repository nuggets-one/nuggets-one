import { createClient } from '@/lib/supabase/server'
import type {
  ArticleCardProps,
  FeedPage,
  FeedPageParams,
  FeedCursor,
  ContentStream,
} from '@/types/article'

const FEED_SELECT = `
  id,
  slug,
  title,
  excerpt,
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

export async function getFeedPage({
  stream,
  tags = [],
  q = '',
  cursor,
  limit = 24,
}: FeedPageParams): Promise<FeedPage> {
  const supabase = await createClient()

  // Branch: full-text search vs cursor pagination
  // Search uses textSearch on search_vector — no cursor support PMF
  // Cursor pagination uses keyset on (published_at DESC, id DESC)

  if (q.trim()) {
    return getFeedPageBySearch({ supabase, stream, tags, q, limit })
  }

  return getFeedPageByCursor({ supabase, stream, tags, cursor, limit })
}

async function getFeedPageByCursor({
  supabase,
  stream,
  tags,
  cursor,
  limit,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  stream: ContentStream
  tags: string[]
  cursor?: FeedCursor
  limit: number
}): Promise<FeedPage> {
  let query = supabase
    .from('articles')
    .select(FEED_SELECT)
    .eq('status', 'published')
    .eq('content_stream', stream)
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)

  // Multi-tag AND filter using GIN-indexed tag_slugs array
  if (tags.length > 0) {
    query = query.contains('tag_slugs', tags)
  }

  // Keyset cursor — both fields required for stable pagination
  if (cursor) {
    query = query.or(
      `published_at.lt.${cursor.published_at},` +
      `and(published_at.eq.${cursor.published_at},id.lt.${cursor.id})`
    )
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`getFeedPage error: ${error.message}`)
  }

  // TODO: replace with generated DB types in later PR
  const articles = (data ?? []) as unknown as ArticleCardProps[]

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
  limit,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  stream: ContentStream
  tags: string[]
  q: string
  limit: number
}): Promise<FeedPage> {
  let query = supabase
    .from('articles')
    .select(FEED_SELECT)
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

  const { data, error } = await query

  if (error) {
    throw new Error(`getFeedPageBySearch error: ${error.message}`)
  }

  // Search results have no stable cursor — return null
  // PR-09 can add pagination for search results if needed post-PMF
  return {
    articles: (data ?? []) as unknown as ArticleCardProps[],
    nextCursor: null,
    stream,
  }
}
