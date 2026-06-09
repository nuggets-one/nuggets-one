import { createClient } from '@/lib/supabase/server'
import { normalizeCuratorDisplayNameOnRows } from '@/lib/queries/normalize-curator-display-name'
import { attachTagLabelsToRows } from '@/lib/queries/card-tag-labels'
import type { SupabaseLike } from '@/lib/queries/card-tag-labels'
import { attachCardPreviewHtml } from '@/lib/ui/card-preview-markdown'
import {
  normalizeHeroMediaKind,
  type ArticleCardProps,
} from '@/types/article'

// Phase 14: bookmarks doesn't fetch `article_media`; cards stay single-hero.
// `images: []` is appended after normalization.
type ArticleRowBase = Omit<ArticleCardProps, 'cardPreviewHtml' | 'tag_labels' | 'tag_dimensions'>
type ArticleRowWithLabels = Omit<ArticleCardProps, 'cardPreviewHtml'>
type TaggableRow = Record<string, unknown> & { tag_slugs: string[] }

type BookmarkWithArticleRow = {
  articles: Omit<ArticleCardProps, 'cardPreviewHtml' | 'images' | 'tag_labels' | 'tag_dimensions'> | Omit<ArticleCardProps, 'cardPreviewHtml' | 'images' | 'tag_labels' | 'tag_dimensions'>[] | null
}

const BOOKMARK_ARTICLE_FIELDS = `
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
  source_url,
  tag_slugs,
  curator_display_name
`.trim()

const LEGACY_BOOKMARK_ARTICLE_FIELDS = `
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
  source_url,
  tag_slugs,
  curator_display_name
`.trim()

const BOOKMARK_ARTICLE_FIELDS_NO_CURATOR = `
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
  source_url,
  tag_slugs
`.trim()

const LEGACY_BOOKMARK_ARTICLE_FIELDS_NO_CURATOR = `
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
  source_url,
  tag_slugs
`.trim()

function isMissingCardPreviewError(message: string): boolean {
  return /card_preview/i.test(message)
}

function isMissingCuratorDisplayNameColumnError(message: string): boolean {
  return /curator_display_name/i.test(message) && /does not exist/i.test(message)
}

/** Batched bookmark lookup for feed/collection cards (caller supplies user id). */
export async function getBookmarkedArticleIdsForUser(
  userId: string,
  articleIds: string[]
): Promise<Set<string>> {
  const unique = [...new Set(articleIds)].filter(Boolean)
  if (unique.length === 0) return new Set()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookmarks')
    .select('article_id')
    .eq('user_id', userId)
    .in('article_id', unique)

  if (error || !data) return new Set()
  return new Set(data.map((row) => row.article_id as string))
}

export async function getBookmarkedArticles(): Promise<ArticleCardProps[]> {
  const supabase = await createClient()

  async function runQuery(articleFields: string) {
    return supabase
      .from('bookmarks')
      .select(`
        article_id,
        articles (
          ${articleFields}
        )
      `)
      .order('created_at', { ascending: false })
  }

  let { data, error } = await runQuery(BOOKMARK_ARTICLE_FIELDS)
  if (error && isMissingCuratorDisplayNameColumnError(error.message)) {
    ;({ data, error } = await runQuery(BOOKMARK_ARTICLE_FIELDS_NO_CURATOR))
  }
  if (error && isMissingCardPreviewError(error.message)) {
    ;({ data, error } = await runQuery(LEGACY_BOOKMARK_ARTICLE_FIELDS))
    if (error && isMissingCuratorDisplayNameColumnError(error.message)) {
      ;({ data, error } = await runQuery(LEGACY_BOOKMARK_ARTICLE_FIELDS_NO_CURATOR))
    }
  }

  if (error || !data) return []

  // Relation payload shape can vary with generated DB types (object vs array).
  // Normalize to one article per bookmark row.
  const rawArticles = ((data as unknown) as BookmarkWithArticleRow[])
    .map((row) => {
      if (!row.articles) return null
      const raw = Array.isArray(row.articles) ? row.articles[0] ?? null : row.articles
      return raw as Record<string, unknown> | null
    })
    .filter((row): row is Record<string, unknown> => row !== null)

  const normalized = normalizeCuratorDisplayNameOnRows(rawArticles)

  const rowsWithoutLabels = normalized.map((article) => ({
    ...article,
    images: [],
    image_count: 0,
    hero_media_kind: normalizeHeroMediaKind(article.hero_media_kind),
  })) as unknown as ArticleRowBase[]

  const rows = await attachTagLabelsToRows(
    supabase as unknown as SupabaseLike,
    rowsWithoutLabels as unknown as TaggableRow[]
  ) as ArticleRowWithLabels[]
  return attachCardPreviewHtml(rows)
}
