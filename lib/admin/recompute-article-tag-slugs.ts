import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'
import { revalidateArticle } from '@/lib/cache'

type AdminDb = ReturnType<typeof createAdminClient>

/**
 * Rebuilds `articles.tag_slugs` from `article_tags` for the given articles.
 * Frozen derivation per admin CLAUDE.md / upsert_article_tags migration.
 */
export async function recomputeTagSlugsForArticles(
  db: AdminDb,
  articleIds: string[]
): Promise<void> {
  const uniqueIds = [...new Set(articleIds.filter(Boolean))]
  if (uniqueIds.length === 0) return

  for (const articleId of uniqueIds) {
    const { data: links, error: linkError } = await db
      .from('article_tags')
      .select('tag_id, tags!inner(slug)')
      .eq('article_id', articleId)

    if (linkError) throw new Error(linkError.message)

    const slugs = (links ?? [])
      .map((row) => {
        const tag = row.tags as { slug: string } | { slug: string }[] | null
        if (!tag) return null
        if (Array.isArray(tag)) return tag[0]?.slug ?? null
        return tag.slug
      })
      .filter((s): s is string => Boolean(s))
      .sort()

    const { error: updateError } = await db
      .from('articles')
      .update({ tag_slugs: slugs })
      .eq('id', articleId)

    if (updateError) throw new Error(updateError.message)

    revalidateArticle(articleId)
  }
}

/** Article IDs that reference a tag via `article_tags`. */
export async function articleIdsForTag(db: AdminDb, tagId: string): Promise<string[]> {
  const { data, error } = await db
    .from('article_tags')
    .select('article_id')
    .eq('tag_id', tagId)

  if (error) throw new Error(error.message)

  return [...new Set((data ?? []).map((row) => row.article_id as string))]
}
