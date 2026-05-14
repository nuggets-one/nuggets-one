// Per-collection revalidateTag can be wired when a collections admin editor ships.

import { notFound } from 'next/navigation'
import { getPublicClient } from '@/lib/supabase/public'
import { attachTagLabelsToRows } from '@/lib/queries/card-tag-labels'
import type { SupabaseLike } from '@/lib/queries/card-tag-labels'
import { attachCardPreviewHtml } from '@/lib/ui/card-preview-markdown'
import type { CollectionSummary, CollectionDetail } from '@/types/collection'
import {
  normalizeHeroMediaKind,
  type ArticleCardProps,
} from '@/types/article'

// Phase 14: collections doesn't fetch `article_media`; cards stay single-hero.
// `images: []` is appended in the mapping step below.
type ArticleRowWithoutImages = Omit<ArticleCardProps, 'cardPreviewHtml' | 'images' | 'tag_labels'>
type ArticleRowBase = Omit<ArticleCardProps, 'cardPreviewHtml' | 'tag_labels'>
type ArticleRowWithLabels = Omit<ArticleCardProps, 'cardPreviewHtml'>
type TaggableRow = Record<string, unknown> & { tag_slugs: string[] }

type CollectionEntryRow = {
  position: number
  articles: ArticleRowWithoutImages | null
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
  const supabase = getPublicClient()

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
    .eq('status', 'published')
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

const LEGACY_ARTICLE_FIELDS = `
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

function isMissingCardPreviewError(message: string): boolean {
  return /card_preview/i.test(message)
}

export async function getCollectionById(id: string): Promise<CollectionDetail> {
  const supabase = getPublicClient()

  async function runQuery(articleFields: string) {
    return supabase
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
          articles ( ${articleFields} )
        )
      `)
      .eq('id', id)
      .eq('status', 'published')
      .single()
  }

  let { data, error } = await runQuery(ARTICLE_FIELDS)
  if (error && isMissingCardPreviewError(error.message)) {
    ;({ data, error } = await runQuery(LEGACY_ARTICLE_FIELDS))
  }

  if (error) {
    throw new Error(`getCollectionById error: ${error.message}`)
  }
  if (!data) notFound()

  const raw = data as unknown as CollectionDetailRow
  const entries: Array<{ position: number; articles: ArticleRowWithoutImages | null }> =
    raw.community_collection_entries ?? []

  const rowsWithoutLabels: ArticleRowBase[] = entries
    .filter((e) => e.articles != null)
    .sort((a, b) => a.position - b.position)
    .map((e) => ({
      ...(e.articles as ArticleRowWithoutImages),
      images: [],
      hero_media_kind: normalizeHeroMediaKind(
        (e.articles as ArticleRowWithoutImages).hero_media_kind
      ),
    }))

  const rows = await attachTagLabelsToRows(
    supabase as unknown as SupabaseLike,
    rowsWithoutLabels as unknown as TaggableRow[]
  ) as ArticleRowWithLabels[]
  const articles = await attachCardPreviewHtml(rows)

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
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('community_collections')
    .select('title, description')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error || !data) return null
  const row = data as unknown as { title: string; description: string | null }
  return { title: row.title, description: row.description }
}
