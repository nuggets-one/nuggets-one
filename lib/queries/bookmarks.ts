import { createClient } from '@/lib/supabase/server'
import type { ArticleCardProps } from '@/types/article'

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

  return data
    .map((row: any) => row.articles)
    .filter(Boolean) as ArticleCardProps[]
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

  const { data } = await supabase
    .from('bookmarks')
    .select('article_id')
    .in('article_id', articleIds)

  return new Set((data ?? []).map((row: any) => row.article_id as string))
}
