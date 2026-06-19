import Link from 'next/link'
import {
  buildAdminArticlesHref,
  type AdminArticlesListFilters,
} from '@/app/admin/articles/_lib/list-url'

type Props = {
  filters: AdminArticlesListFilters
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
}

export function ArticlesListPagination({
  filters,
  page,
  pageSize,
  totalCount,
  totalPages,
  hasPrev,
  hasNext,
}: Props) {
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(totalCount, page * pageSize)
  const prevHref = buildAdminArticlesHref({ ...filters, page: page - 1 })
  const nextHref = buildAdminArticlesHref({ ...filters, page: page + 1 })

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm">
      <p className="text-muted">
        Showing {rangeStart}–{rangeEnd} of {totalCount} article{totalCount === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-muted">
          Page {page} of {totalPages}
        </span>
        {hasPrev ? (
          <Link
            href={prevHref}
            className="rounded-lg border border-border bg-bg px-3 py-1.5 font-medium text-primary transition-colors hover:border-border-strong hover:bg-surface"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-lg border border-border px-3 py-1.5 text-muted opacity-60">
            Previous
          </span>
        )}
        {hasNext ? (
          <Link
            href={nextHref}
            className="rounded-lg border border-border bg-bg px-3 py-1.5 font-medium text-primary transition-colors hover:border-border-strong hover:bg-surface"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-lg border border-border px-3 py-1.5 text-muted opacity-60">
            Next
          </span>
        )}
      </div>
    </div>
  )
}
