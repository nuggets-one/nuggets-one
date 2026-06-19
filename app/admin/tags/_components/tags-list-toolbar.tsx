import Link from 'next/link'
import {
  hasActiveTagsFilters,
  type AdminTagsListFilters,
} from '@/app/admin/tags/_lib/list-url'

type Props = {
  filters: AdminTagsListFilters
  totalCount: number
}

const DIMENSION_FILTER_OPTIONS = [
  { value: 'all', label: 'All dimensions' },
  { value: 'format', label: 'Format' },
  { value: 'domain', label: 'Domain' },
  { value: 'subtopic', label: 'Subtopic' },
  { value: 'source', label: 'Source' },
  { value: 'uncategorized', label: 'Uncategorized' },
] as const

function buildFilterSummary(filters: AdminTagsListFilters): string | null {
  if (!hasActiveTagsFilters(filters)) return null

  const parts: string[] = []
  if (filters.q) parts.push(`"${filters.q}"`)
  if (filters.dimension && filters.dimension !== 'all') {
    const label = DIMENSION_FILTER_OPTIONS.find((opt) => opt.value === filters.dimension)?.label
    parts.push(label ?? filters.dimension)
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

const fieldClassName =
  'rounded-md border border-border bg-bg px-2 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/40'

export function TagsListToolbar({ filters, totalCount }: Props) {
  const active = hasActiveTagsFilters(filters)
  const summary = buildFilterSummary(filters)
  const dimensionValue = filters.dimension ?? 'all'

  return (
    <div className="mb-3 rounded-lg border border-border bg-surface-raised px-2.5 py-2">
      <form
        method="get"
        action="/admin/tags"
        className="flex flex-wrap items-center gap-2"
      >
        <input
          type="search"
          name="q"
          defaultValue={filters.q ?? ''}
          placeholder="Search label or slug…"
          aria-label="Search tags"
          className={`min-w-[10rem] flex-1 ${fieldClassName}`}
        />

        <select
          name="dimension"
          defaultValue={dimensionValue}
          aria-label="Filter by dimension"
          className={`w-full sm:w-36 ${fieldClassName}`}
        >
          {DIMENSION_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          Apply
        </button>

        {active ? (
          <Link
            href="/admin/tags"
            className="rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-surface"
          >
            Clear
          </Link>
        ) : null}

        {summary ? (
          <span className="w-full text-xs text-muted sm:ml-auto sm:w-auto">
            {totalCount} result{totalCount === 1 ? '' : 's'} · {summary}
          </span>
        ) : null}
      </form>
    </div>
  )
}
