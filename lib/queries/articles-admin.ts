import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import { CONTENT_STREAMS, type ContentStream } from '@/types/article'

export const ADMIN_ARTICLES_PAGE_SIZE = 50

export type AdminArticlesListFilters = {
  q?: string
  status?: 'draft' | 'published' | 'all'
  stream?: ContentStream | 'all'
}

function escapeIlike(q: string): string {
  return q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

export type AdminArticleRow = {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published'
  content_stream: string
  published_at: string | null
  hero_thumb_url: string | null
  hero_alt_text: string | null
  hero_media_kind: 'image' | 'youtube' | null
  hero_video_id: string | null
}

export type AdminArticlesPage = {
  rows: AdminArticleRow[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
}

export async function listAdminArticlesPage({
  page,
  pageSize = ADMIN_ARTICLES_PAGE_SIZE,
  q,
  status = 'all',
  stream = 'all',
}: {
  page: number
  pageSize?: number
} & AdminArticlesListFilters): Promise<AdminArticlesPage> {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1
  const safePageSize = Number.isFinite(pageSize)
    ? Math.min(100, Math.max(1, Math.trunc(pageSize)))
    : ADMIN_ARTICLES_PAGE_SIZE

  const trimmedQ = q?.trim()
  const searchQ = trimmedQ && trimmedQ.length >= 2 ? trimmedQ : undefined

  const db = getAdminClient()
  const fetchRows = async (targetPage: number) => {
    const from = (targetPage - 1) * safePageSize
    const to = from + safePageSize - 1

    let query = db
      .from('articles')
      .select(
        'id, slug, title, status, content_stream, published_at, hero_thumb_url, hero_alt_text, hero_media_kind, hero_video_id',
        { count: 'exact' },
      )

    if (searchQ) {
      query = query.ilike('title', `%${escapeIlike(searchQ)}%`)
    }
    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (stream !== 'all' && (CONTENT_STREAMS as readonly string[]).includes(stream)) {
      query = query.eq('content_stream', stream)
    }

    return query.order('created_at', { ascending: false }).range(from, to)
  }

  const { data, count, error } = await fetchRows(safePage)
  if (error) throw new Error(`listAdminArticlesPage: ${error.message}`)

  const totalCount = typeof count === 'number' && Number.isFinite(count) ? count : 0
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize))
  const clampedPage = Math.min(safePage, totalPages)

  let resolvedRows = data ?? []
  if (clampedPage !== safePage) {
    const { data: clampedData, error: clampedError } = await fetchRows(clampedPage)
    if (clampedError) throw new Error(`listAdminArticlesPage (clamped): ${clampedError.message}`)
    resolvedRows = clampedData ?? []
  }

  return {
    rows: resolvedRows.map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      status: row.status as 'draft' | 'published',
      content_stream: row.content_stream as string,
      published_at: (row.published_at as string | null) ?? null,
      hero_thumb_url: (row.hero_thumb_url as string | null) ?? null,
      hero_alt_text: (row.hero_alt_text as string | null) ?? null,
      hero_media_kind: (row.hero_media_kind as 'image' | 'youtube' | null) ?? null,
      hero_video_id: (row.hero_video_id as string | null) ?? null,
    })),
    page: clampedPage,
    pageSize: safePageSize,
    totalCount,
    totalPages,
    hasPrev: clampedPage > 1,
    hasNext: clampedPage < totalPages,
  }
}
