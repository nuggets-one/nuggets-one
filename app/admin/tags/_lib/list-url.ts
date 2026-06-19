import type { TagAdminListDimension } from '@/lib/queries/tags-admin'
import { TAG_DIMENSIONS } from '@/types/article'

export type AdminTagsListFilters = {
  q?: string
  dimension?: TagAdminListDimension
}

const DIMENSION_VALUES: TagAdminListDimension[] = [
  'all',
  'uncategorized',
  ...TAG_DIMENSIONS,
]

export function parseAdminTagsListFilters(
  params: Record<string, string | string[] | undefined>
): AdminTagsListFilters {
  const qRaw = params.q
  const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw)?.trim() || undefined

  const dimensionRaw = Array.isArray(params.dimension) ? params.dimension[0] : params.dimension
  const dimension =
    dimensionRaw && DIMENSION_VALUES.includes(dimensionRaw as TagAdminListDimension)
      ? (dimensionRaw as TagAdminListDimension)
      : 'all'

  return {
    q,
    dimension: dimension === 'all' ? undefined : dimension,
  }
}

export function hasActiveTagsFilters(filters: AdminTagsListFilters): boolean {
  return Boolean(filters.q || (filters.dimension && filters.dimension !== 'all'))
}

export function buildAdminTagsHref(filters: AdminTagsListFilters): string {
  const search = new URLSearchParams()
  if (filters.q) search.set('q', filters.q)
  if (filters.dimension && filters.dimension !== 'all') {
    search.set('dimension', filters.dimension)
  }
  const qs = search.toString()
  return qs ? `/admin/tags?${qs}` : '/admin/tags'
}
