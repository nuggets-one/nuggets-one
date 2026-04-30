// unstable_cache is NOT used here: createClient() calls cookies(), which is incompatible
// with unstable_cache during static prerendering. Page-level revalidate = 300 (ISR)
// is the correct caching mechanism for fully-public collection routes.
// Per-collection revalidateTag wired when admin editor ships (PR-14).

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { CollectionSummary, CollectionDetail } from '@/types/collection'
import type { ArticleCardProps } from '@/types/article'

type CollectionEntryRow = {
  position: number
  articles: ArticleCardProps | null
}

type CollectionListRow = {
  id: string
  title: string
  description: string | null
  curator_name: string
  cover_image_url: string | null
  created_at: string
  community_collection_entries?: Array<{
    position: number
    articles: { hero_thumb_url: string | null } | null
  }>
}

type CollectionDetailRow = {
  id: string
  title: string
  description: string | null
  curator_name: string
  cover_image_url: string | null
  created_at: string
  community_collection_entries?: CollectionEntryRow[]
}

// ─── Cover derivation ─────────────────────────────────────────────────
// BLUEPRINT §12.3: cover_image_url → first ordered entry hero → null
function deriveCover(
  coverImageUrl: string | null,
  entries: Array<{ position: number; articles: { hero_thumb_url: string | null } | null }>
): string | null {
  if (coverImageUrl) return coverImageUrl
  const sorted = [...entries].sort((a, b) => a.position - b.position)
  return sorted.find((e) => e.articles?.hero_thumb_url)?.articles?.hero_thumb_url ?? null
}

// ─── List ─────────────────────────────────────────────────────────────

export async function listCollections(): Promise<CollectionSummary[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('community_collections')
    .select(`
      id,
      title,
      description,
      curator_name,
      cover_image_url,
      created_at,
      community_collection_entries ( position, articles ( hero_thumb_url ) )
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`listCollections error: ${error.message}`)
  }

  return ((data ?? []) as unknown as CollectionListRow[]).map((row) => {
    const entries: Array<{ position: number; articles: { hero_thumb_url: string | null } | null }> =
      row.community_collection_entries ?? []

    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | null,
      curator_name: row.curator_name as string,
      cover_url: deriveCover(row.cover_image_url as string | null, entries),
      created_at: row.created_at as string,
      entry_count: entries.length,
    }
  })
}

// ─── Detail ───────────────────────────────────────────────────────────

const ARTICLE_FIELDS = `
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

export async function getCollectionById(id: string): Promise<CollectionDetail> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('community_collections')
    .select(`
      id,
      title,
      description,
      curator_name,
      cover_image_url,
      created_at,
      community_collection_entries (
        position,
        articles ( ${ARTICLE_FIELDS} )
      )
    `)
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (error || !data) notFound()

  const raw = data as unknown as CollectionDetailRow
  const entries: Array<{ position: number; articles: ArticleCardProps | null }> =
    raw.community_collection_entries ?? []

  const articles: ArticleCardProps[] = entries
    .filter((e) => e.articles != null)
    .sort((a, b) => a.position - b.position)
    .map((e) => e.articles as ArticleCardProps)

  const coverEntries = entries.map((e) => ({
    position: e.position,
    articles: e.articles
      ? { hero_thumb_url: e.articles.hero_thumb_url as string | null }
      : null,
  }))

  return {
    id: raw.id as string,
    title: raw.title as string,
    description: raw.description as string | null,
    curator_name: raw.curator_name as string,
    cover_url: deriveCover(raw.cover_image_url as string | null, coverEntries),
    created_at: raw.created_at as string,
    articles,
  }
}

// Lightweight meta for generateMetadata — avoids loading full entries.
export async function getCollectionMeta(
  id: string
): Promise<{ title: string; description: string | null } | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('community_collections')
    .select('title, description')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (error || !data) return null
  return { title: data.title as string, description: data.description as string | null }
}
