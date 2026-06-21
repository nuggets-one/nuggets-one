import { CONTENT_STREAMS, type ContentStream } from '@/types/article'

export type AdminArticlesListFilters = {
  q?: string
  status?: 'draft' | 'published' | 'all'
  stream?: ContentStream | 'all'
}

export type AdminArticlesListParams = AdminArticlesListFilters & {
  page?: number
}

export function parseAdminArticlesFilters(
  resolved: Record<string, string | string[] | undefined>,
): AdminArticlesListFilters {
  const qRaw = typeof resolved.q === 'string' ? resolved.q.trim() : undefined
  const q = qRaw && qRaw.length >= 2 ? qRaw : undefined

  const statusRaw = typeof resolved.status === 'string' ? resolved.status : undefined
  const status =
    statusRaw === 'draft' || statusRaw === 'published' ? statusRaw : ('all' as const)

  const streamRaw = typeof resolved.stream === 'string' ? resolved.stream : undefined
  const stream =
    streamRaw && (CONTENT_STREAMS as readonly string[]).includes(streamRaw)
      ? (streamRaw as ContentStream)
      : ('all' as const)

  return { q, status, stream }
}

export function parsePageParam(value: string | undefined): number {
  if (!value || !/^[0-9]+$/.test(value)) return 1
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1
}

export function firstString(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined
}

export function buildAdminArticlesHref(
  filters: AdminArticlesListParams,
  targetPage?: number,
): string {
  const params = new URLSearchParams()

  if (filters.q) params.set('q', filters.q)
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters.stream && filters.stream !== 'all') params.set('stream', filters.stream)

  const page = targetPage ?? filters.page
  if (page && page > 1) params.set('page', String(page))

  const query = params.toString()
  return query.length > 0 ? `/admin/articles?${query}` : '/admin/articles'
}

export function hasActiveFilters(filters: AdminArticlesListFilters): boolean {
  return Boolean(
    filters.q ||
      (filters.status && filters.status !== 'all') ||
      (filters.stream && filters.stream !== 'all'),
  )
}
