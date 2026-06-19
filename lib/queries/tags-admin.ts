import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { TagDimension, TagSummary } from '@/types/article'

export type TagAdminDetail = TagSummary & {
  article_count: number
}

export type TagAdminRow = TagSummary & {
  article_count: number
}

export type TagAdminListDimension = TagDimension | 'uncategorized' | 'all'

export type TagsAdminStats = {
  total: number
  official: number
}

function escapeIlike(q: string): string {
  return q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

function escapeOrFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export async function getTagsAdminStats(): Promise<TagsAdminStats> {
  const db = createAdminClient()

  const [totalResult, officialResult] = await Promise.all([
    db.from('tags').select('id', { count: 'exact', head: true }),
    db.from('tags').select('id', { count: 'exact', head: true }).eq('is_official', true),
  ])

  if (totalResult.error) throw new Error(totalResult.error.message)
  if (officialResult.error) throw new Error(officialResult.error.message)

  return {
    total: totalResult.count ?? 0,
    official: officialResult.count ?? 0,
  }
}

const ARTICLE_TAG_COUNT_PAGE_SIZE = 1000

async function fetchTagArticleCountMap(
  db: ReturnType<typeof createAdminClient>
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  let offset = 0

  while (true) {
    const { data, error } = await db
      .from('article_tags')
      .select('tag_id')
      .range(offset, offset + ARTICLE_TAG_COUNT_PAGE_SIZE - 1)

    if (error) throw new Error(error.message)
    if (!data?.length) break

    for (const row of data) {
      const id = row.tag_id as string
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }

    if (data.length < ARTICLE_TAG_COUNT_PAGE_SIZE) break
    offset += ARTICLE_TAG_COUNT_PAGE_SIZE
  }

  return counts
}

export async function listTagsAdmin(opts?: {
  q?: string
  dimension?: TagAdminListDimension
}): Promise<TagAdminRow[]> {
  const db = createAdminClient()
  const q = opts?.q?.trim()
  const dimension = opts?.dimension ?? 'all'

  let query = db
    .from('tags')
    .select('id, slug, label, dimension, is_official')
    .order('label', { ascending: true })

  if (q) {
    const pattern = `%${escapeIlike(q)}%`
    const quotedPattern = escapeOrFilterValue(pattern)
    query = query.or(`label.ilike."${quotedPattern}",slug.ilike."${quotedPattern}"`)
  }

  if (dimension === 'uncategorized') {
    query = query.is('dimension', null)
  } else if (dimension !== 'all') {
    query = query.eq('dimension', dimension)
  }

  const [{ data: tags, error }, countMap] = await Promise.all([
    query,
    fetchTagArticleCountMap(db),
  ])

  if (error) throw new Error(error.message)
  if (!tags?.length) return []

  return tags.map((tag) => ({
    ...(tag as TagSummary),
    article_count: countMap.get(tag.id as string) ?? 0,
  }))
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
