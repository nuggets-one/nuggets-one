import { createClient } from '@/lib/supabase/server'
import type { ArticleCardProps } from '@/types/article'

type BookmarkWithArticleRow = {
  articles: ArticleCardProps | ArticleCardProps[] | null
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
  return (data as BookmarkWithArticleRow[])
    .map((row) => {
      if (!row.articles) return null
      return Array.isArray(row.articles) ? row.articles[0] ?? null : row.articles
    })
    .filter((article): article is ArticleCardProps => article !== null)
}

export async function isArticleBookmarked(articleId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('article_id', articleId)
    .maybeSingle()

  return !!data
}

// Batch check — BLUEPRINT: "one batched GET per feed page (24 IDs max) — not per card"
export async function getBookmarkedArticleIds(
  articleIds: string[]
): Promise<Set<string>> {
  if (!articleIds.length) return new Set()

  const supabase = await createClient()
  // S3-F6: explicit user_id filter (defense-in-depth on top of RLS)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Set()

  const { data } = await supabase
    .from('bookmarks')
    .select('article_id')
    .eq('user_id', user.id)
    .in('article_id', articleIds)

  return new Set(
    (data ?? []).map((row: { article_id: string }) => row.article_id)
  )
}
