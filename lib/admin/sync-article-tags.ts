import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'

type AdminDb = ReturnType<typeof createAdminClient>

export type SyncArticleTagsResult =
  | { ok: true }
  | { ok: false; code: 'unknown_tags' | 'tag_update_failed'; message: string }

/** PostgREST when `upsert_article_tags` migration was not applied to the project. */
function isMissingTagsRpc(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST202' || /upsert_article_tags/i.test(error.message ?? '')
}

/**
 * Replaces article tag associations and recomputes `articles.tag_slugs`.
 * Prefers the `upsert_article_tags` RPC; falls back to sequential writes when the RPC is absent.
 */
export async function syncArticleTags(
  db: AdminDb,
  articleId: string,
  tagSlugs: string[]
): Promise<SyncArticleTagsResult> {
  const uniqueSlugs = [...new Set(tagSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean))]

  const { error: rpcError } = await db.rpc('upsert_article_tags', {
    p_article_id: articleId,
    p_tag_slugs: uniqueSlugs,
  })

  if (!rpcError) return { ok: true }
  if (!isMissingTagsRpc(rpcError)) {
    return tagErrorFromPostgrest(rpcError)
  }

  return syncArticleTagsFallback(db, articleId, uniqueSlugs)
}

async function syncArticleTagsFallback(
  db: AdminDb,
  articleId: string,
  tagSlugs: string[]
): Promise<SyncArticleTagsResult> {
  let tagRows: { id: string; slug: string }[] = []

  if (tagSlugs.length > 0) {
    const { data, error } = await db.from('tags').select('id, slug').in('slug', tagSlugs)
    if (error) {
      return { ok: false, code: 'tag_update_failed', message: error.message }
    }

    tagRows = data ?? []
    const found = new Set(tagRows.map((row) => row.slug))
    const missing = tagSlugs.filter((slug) => !found.has(slug))
    if (missing.length > 0) {
      return {
        ok: false,
        code: 'unknown_tags',
        message: `unknown_tag_slugs: ${missing.join(', ')}`,
      }
    }
  }

  const { error: deleteError } = await db.from('article_tags').delete().eq('article_id', articleId)
  if (deleteError) {
    return { ok: false, code: 'tag_update_failed', message: deleteError.message }
  }

  if (tagRows.length > 0) {
    const { error: insertError } = await db.from('article_tags').insert(
      tagRows.map((row) => ({
        article_id: articleId,
        tag_id: row.id,
      }))
    )
    if (insertError) {
      return { ok: false, code: 'tag_update_failed', message: insertError.message }
    }
  }

  const sortedSlugs = [...tagSlugs].sort()
  const { error: updateError } = await db.from('articles').update({ tag_slugs: sortedSlugs }).eq('id', articleId)
  if (updateError) {
    return { ok: false, code: 'tag_update_failed', message: updateError.message }
  }

  return { ok: true }
}

function tagErrorFromPostgrest(error: { message?: string }): SyncArticleTagsResult {
  const message = error.message ?? 'Tag update failed'
  if (message.includes('unknown_tag_slugs')) {
    return { ok: false, code: 'unknown_tags', message }
  }
  return { ok: false, code: 'tag_update_failed', message }
}
