import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'

export const ADMIN_ARTICLES_PAGE_SIZE = 50

export type AdminArticleRow = {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published'
  content_stream: string
  published_at: string | null
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
}: {
  page: number
  pageSize?: number
}): Promise<AdminArticlesPage> {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1
  const safePageSize = Number.isFinite(pageSize)
    ? Math.min(100, Math.max(1, Math.trunc(pageSize)))
    : ADMIN_ARTICLES_PAGE_SIZE

  const db = getAdminClient()
  const fetchRows = async (targetPage: number) => {
    const from = (targetPage - 1) * safePageSize
    const to = from + safePageSize - 1
    return db
      .from('articles')
      .select('id, slug, title, status, content_stream, published_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
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
    })),
    page: clampedPage,
    pageSize: safePageSize,
    totalCount,
    totalPages,
    hasPrev: clampedPage > 1,
    hasNext: clampedPage < totalPages,
  }
}
