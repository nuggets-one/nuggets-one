import { createClient } from '@/lib/supabase/server'
import { attachExcerptHtml } from '@/lib/ui/excerpt-markdown'
import type { ArticleCardProps } from '@/types/article'

// Phase 14: bookmarks doesn't fetch `article_media`; cards stay single-hero.
// `images: []` is appended after normalization.
type ArticleRowWithoutImages = Omit<ArticleCardProps, 'excerptHtml' | 'images'>
type ArticleRow = Omit<ArticleCardProps, 'excerptHtml'>

type BookmarkWithArticleRow = {
  articles: ArticleRowWithoutImages | ArticleRowWithoutImages[] | null
}

export async function getBookmarkedArticles(): Promise<ArticleCardProps[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bookmarks')
    .select(`
      article_id,
      articles (
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
        source_url,
        tag_slugs
      )
    `)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  // Relation payload shape can vary with generated DB types (object vs array).
  // Normalize to one article per bookmark row.
  const rows: ArticleRow[] = (data as BookmarkWithArticleRow[])
    .map((row) => {
      if (!row.articles) return null
      return Array.isArray(row.articles) ? row.articles[0] ?? null : row.articles
    })
    .filter((article): article is ArticleRowWithoutImages => article !== null)
    .map((article) => ({ ...article, images: [] }))

  return attachExcerptHtml(rows)
}
