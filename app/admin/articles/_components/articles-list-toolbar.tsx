import Link from 'next/link'
import {
  buildAdminArticlesHref,
  hasActiveFilters,
  type AdminArticlesListFilters,
} from '@/app/admin/articles/_lib/list-url'
import { getStreamLabel } from '@/lib/copy/streams'
import { CONTENT_STREAMS, type ContentStream } from '@/types/article'

type Props = {
  filters: AdminArticlesListFilters
  totalCount: number
}

function buildFilterSummary(filters: AdminArticlesListFilters): string | null {
  if (!hasActiveFilters(filters)) return null

  const parts: string[] = []
  if (filters.q) parts.push(`matching "${filters.q}"`)
  if (filters.status && filters.status !== 'all') parts.push(`${filters.status} only`)
  if (filters.stream && filters.stream !== 'all') {
    parts.push(`in ${getStreamLabel(filters.stream as ContentStream)}`)
  }

  return parts.length > 0 ? parts.join(', ') : null
}

export function ArticlesListToolbar({ filters, totalCount }: Props) {
  const active = hasActiveFilters(filters)
  const summary = buildFilterSummary(filters)

  return (
    <div className="mb-4 rounded-xl border border-border bg-surface-raised p-3">
      <form method="get" action="/admin/articles" className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Search</span>
            <input
              type="search"
              name="q"
              defaultValue={filters.q ?? ''}
              placeholder="Search by title…"
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Status</span>
            <select
              name="status"
              defaultValue={filters.status ?? 'all'}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Stream</span>
            <select
              name="stream"
              defaultValue={filters.stream ?? 'all'}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="all">All streams</option>
              {CONTENT_STREAMS.map((stream) => (
                <option key={stream} value={stream}>
                  {getStreamLabel(stream)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Apply filters
          </button>
          {active && (
            <Link
              href="/admin/articles"
              className="rounded-lg border border-border bg-bg px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-border-strong hover:bg-surface"
            >
              Clear filters
            </Link>
          )}
        </div>
      </form>

      {summary && (
        <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
          {totalCount} result{totalCount === 1 ? '' : 's'} {summary}
        </p>
      )}
    </div>
  )
}

export function buildReturnToHref(filters: AdminArticlesListFilters, page: number): string {
  return buildAdminArticlesHref({ ...filters, page })
}
