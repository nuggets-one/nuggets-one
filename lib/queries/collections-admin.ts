import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'

export type CollectionAdminRow = {
  id: string
  title: string
  description: string | null
  curator_name: string
  cover_image_url: string | null
  status: 'draft' | 'published'
  parent_id: string | null
  parent_title: string | null
  is_featured: boolean
  featured_order: number | null
  created_at: string
  updated_at: string
  entry_count: number
}

export type CollectionEntryAdminRow = {
  article_id: string
  position: number
  title: string
  slug: string
  status: string
  content_stream: string
}

export type CollectionAdminDetail = CollectionAdminRow & {
  entries: CollectionEntryAdminRow[]
}

export type ArticlePickerRow = {
  id: string
  title: string
  slug: string
  content_stream: string
}

function escapeIlike(q: string): string {
  return q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

export async function listCollectionsAdmin(): Promise<CollectionAdminRow[]> {
  const db = getAdminClient()

  const { data: cols, error } = await db
    .from('community_collections')
    .select(
      'id, title, description, curator_name, cover_image_url, status, parent_id, is_featured, featured_order, created_at, updated_at'
    )
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`listCollectionsAdmin: ${error.message}`)

  const { data: entryRows, error: entryErr } = await db
    .from('community_collection_entries')
    .select('collection_id')

  if (entryErr) throw new Error(`listCollectionsAdmin entries: ${entryErr.message}`)

  const countMap = new Map<string, number>()
  for (const row of entryRows ?? []) {
    const cid = row.collection_id as string
    countMap.set(cid, (countMap.get(cid) ?? 0) + 1)
  }

  const titleById = new Map<string, string>()
  for (const row of cols ?? []) {
    titleById.set(row.id as string, row.title as string)
  }

  return (cols ?? []).map((row) => {
    const parentId = (row.parent_id as string | null) ?? null
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | null,
      curator_name: row.curator_name as string,
      cover_image_url: row.cover_image_url as string | null,
      status: row.status as 'draft' | 'published',
      parent_id: parentId,
      parent_title: parentId ? (titleById.get(parentId) ?? null) : null,
      is_featured: row.is_featured === true,
      featured_order:
        typeof row.featured_order === 'number' && Number.isFinite(row.featured_order)
          ? row.featured_order
          : null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      entry_count: countMap.get(row.id as string) ?? 0,
    }
  })
}

export async function listRootCollectionsAdmin(): Promise<
  Pick<CollectionAdminRow, 'id' | 'title'>[]
> {
  const db = getAdminClient()
  const { data, error } = await db
    .from('community_collections')
    .select('id, title')
    .is('parent_id', null)
    .order('title', { ascending: true })

  if (error) throw new Error(`listRootCollectionsAdmin: ${error.message}`)
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
  }))
}

export async function getCollectionAdminById(id: string): Promise<CollectionAdminDetail | null> {
  const db = getAdminClient()

  const { data: col, error } = await db
    .from('community_collections')
    .select(
      'id, title, description, curator_name, cover_image_url, status, parent_id, is_featured, featured_order, created_at, updated_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`getCollectionAdminById: ${error.message}`)
  if (!col) return null

  const { data: entryData, error: entryErr } = await db
    .from('community_collection_entries')
    .select(`
      position,
      article_id,
      articles ( id, title, slug, status, content_stream )
    `)
    .eq('collection_id', id)
    .order('position', { ascending: true })

  if (entryErr) throw new Error(`getCollectionAdminById entries: ${entryErr.message}`)

  const entries: CollectionEntryAdminRow[] = []
  for (const row of entryData ?? []) {
    const raw = row.articles
    const article = Array.isArray(raw) ? raw[0] : raw
    if (!article || typeof article !== 'object') continue
    const a = article as Record<string, unknown>
    entries.push({
      article_id: row.article_id as string,
      position: row.position as number,
      title: String(a.title ?? ''),
      slug: String(a.slug ?? ''),
      status: String(a.status ?? ''),
      content_stream: String(a.content_stream ?? 'standard'),
    })
  }

  let parent_title: string | null = null
  const parentId = (col.parent_id as string | null) ?? null
  if (parentId) {
    const { data: parentRow } = await db
      .from('community_collections')
      .select('title')
      .eq('id', parentId)
      .maybeSingle()
    parent_title = parentRow ? (parentRow.title as string) : null
  }

  return {
    id: col.id as string,
    title: col.title as string,
    description: col.description as string | null,
    curator_name: col.curator_name as string,
    cover_image_url: col.cover_image_url as string | null,
    status: col.status as 'draft' | 'published',
    parent_id: parentId,
    parent_title,
    is_featured: col.is_featured === true,
    featured_order:
      typeof col.featured_order === 'number' && Number.isFinite(col.featured_order)
        ? col.featured_order
        : null,
    created_at: col.created_at as string,
    updated_at: col.updated_at as string,
    entry_count: entries.length,
    entries,
  }
}

export async function searchPublishedArticlesForPicker(
  q: string,
  excludeArticleIds: string[],
  limit = 20
): Promise<ArticlePickerRow[]> {
  const trimmed = q.trim()
  if (trimmed.length < 2) return []

  const exclude = new Set(excludeArticleIds)
  const db = getAdminClient()
  const fetchLimit = Math.min(limit + exclude.size, 50)

  const { data, error } = await db
    .from('articles')
    .select('id, title, slug, content_stream')
    .eq('status', 'published')
    .ilike('title', `%${escapeIlike(trimmed)}%`)
    .order('published_at', { ascending: false })
    .limit(fetchLimit)

  if (error) throw new Error(`searchPublishedArticlesForPicker: ${error.message}`)

  return (data ?? [])
    .filter((row) => !exclude.has(row.id as string))
    .slice(0, limit)
    .map((row) => ({
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    content_stream: row.content_stream as string,
  }))
}
