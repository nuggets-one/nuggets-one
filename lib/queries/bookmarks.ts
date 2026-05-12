import { createClient } from '@/lib/supabase/server'
import { attachTagLabelsToRows } from '@/lib/queries/card-tag-labels'
import type { SupabaseLike } from '@/lib/queries/card-tag-labels'
import { attachCardPreviewHtml } from '@/lib/ui/card-preview-markdown'
import type { ArticleCardProps } from '@/types/article'

// Phase 14: bookmarks doesn't fetch `article_media`; cards stay single-hero.
// `images: []` is appended after normalization.
type ArticleRowBase = Omit<ArticleCardProps, 'cardPreviewHtml' | 'tag_labels'>
type ArticleRowWithLabels = Omit<ArticleCardProps, 'cardPreviewHtml'>
type TaggableRow = Record<string, unknown> & { tag_slugs: string[] }

type BookmarkWithArticleRow = {
  articles: Omit<ArticleCardProps, 'cardPreviewHtml' | 'images' | 'tag_labels'> | Omit<ArticleCardProps, 'cardPreviewHtml' | 'images' | 'tag_labels'>[] | null
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
  tag_slugs
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
  tag_slugs
`.trim()

function isMissingCardPreviewError(message: string): boolean {
  return /card_preview/i.test(message)
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
  if (error && isMissingCardPreviewError(error.message)) {
    ;({ data, error } = await runQuery(LEGACY_BOOKMARK_ARTICLE_FIELDS))
  }

  if (error || !data) return []

  // Relation payload shape can vary with generated DB types (object vs array).
  // Normalize to one article per bookmark row.
  const rowsWithoutLabels: ArticleRowBase[] = ((data as unknown) as BookmarkWithArticleRow[])
    .map((row) => {
      if (!row.articles) return null
      return Array.isArray(row.articles) ? row.articles[0] ?? null : row.articles
    })
    .filter((article): article is Omit<ArticleCardProps, 'cardPreviewHtml' | 'images' | 'tag_labels'> => article !== null)
    .map((article) => ({ ...article, images: [] }))

  const rows = await attachTagLabelsToRows(
    supabase as unknown as SupabaseLike,
    rowsWithoutLabels as unknown as TaggableRow[]
  ) as ArticleRowWithLabels[]
  return attachCardPreviewHtml(rows)
}
