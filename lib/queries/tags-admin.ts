import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { TagSummary } from '@/types/article'

export type TagAdminDetail = TagSummary & {
  article_count: number
}

export async function getTagAdminById(id: string): Promise<TagAdminDetail | null> {
  const db = createAdminClient()

  const { data: tag, error } = await db
    .from('tags')
    .select('id, slug, label, dimension, is_official')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!tag) return null

  const { count, error: countError } = await db
    .from('article_tags')
    .select('*', { count: 'exact', head: true })
    .eq('tag_id', id)

  if (countError) throw new Error(countError.message)

  return {
    ...(tag as TagSummary),
    article_count: count ?? 0,
  }
}
