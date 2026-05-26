'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

type TopicOption = {
  id: string
  title: string
  count: number
}

type Props = {
  parents: TopicOption[]
  currentQuery: string
  selectedParentId: string | null
  selectedParentTitle: string | null
  selectedSubTitle: string | null
  totalParents: number
  totalChildren: number
}

import { COLLECTIONS_CURSOR_PARAM } from '@/lib/collections/browse-params'

const SEARCH_DEBOUNCE_MS = 180

const filterPillClasses =
  'inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-chip-active-border bg-chip-active-bg px-3 py-1 text-xs font-medium text-chip-active-text shadow-chip-active ring-1 ring-inset ring-focus/20 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1 disabled:opacity-60'

function toParams(searchParams: URLSearchParams): URLSearchParams {
  return new URLSearchParams(searchParams.toString())
}

type ActiveFiltersProps = {
  currentQuery: string
  selectedParentTitle: string | null
  selectedSubTitle: string | null
  isPending: boolean
  onRemoveSearch: () => void
  onRemoveParent: () => void
  onRemoveSub: () => void
  onClearAll: () => void
}

function CollectionsActiveFilters({
  currentQuery,
  selectedParentTitle,
  selectedSubTitle,
  isPending,
  onRemoveSearch,
  onRemoveParent,
  onRemoveSub,
  onClearAll,
}: ActiveFiltersProps) {
  return (
    <div
      role="region"
      aria-label="Active filters"
      className="rounded-lg border border-border bg-surface-raised/80 px-3 py-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Filters</span>

        {currentQuery && (
          <button
            type="button"
            onClick={onRemoveSearch}
            disabled={isPending}
            aria-label={`Remove search filter ${currentQuery}`}
            className={filterPillClasses}
          >
            <span>Search: &ldquo;{currentQuery}&rdquo;</span>
            <span aria-hidden="true" className="text-chip-active-text/70">
              ×
            </span>
          </button>
        )}

        {selectedParentTitle && (
          <button
            type="button"
            onClick={onRemoveParent}
            disabled={isPending}
            aria-label={`Remove ${selectedParentTitle} topic`}
            className={filterPillClasses}
          >
            <span>{selectedParentTitle}</span>
            <span aria-hidden="true" className="text-chip-active-text/70">
              ×
            </span>
          </button>
        )}

        {selectedSubTitle && (
          <button
            type="button"
            onClick={onRemoveSub}
            disabled={isPending}
            aria-label={`Remove sub-collection filter ${selectedSubTitle}`}
            className={filterPillClasses}
          >
            <span>Sub-collection: {selectedSubTitle}</span>
            <span aria-hidden="true" className="text-chip-active-text/70">
              ×
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onClearAll}
          disabled={isPending}
          aria-label="Clear all filters"
          className="inline-flex min-h-[32px] items-center justify-center rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1 disabled:opacity-60 sm:ml-auto"
        >
          Clear all
        </button>
      </div>
    </div>
  )
}

export function CollectionsToolbar({
  parents,
  currentQuery,
  selectedParentId,
  selectedParentTitle,
  selectedSubTitle,
  totalParents,
  totalChildren,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [queryDraft, setQueryDraft] = useState(currentQuery)
  const visibleParents = useMemo(() => parents.slice(0, 10), [parents])
  const hasAnyFilter = Boolean(currentQuery)
  const hasAnySelection = Boolean(selectedParentId || selectedSubTitle)
  const showActiveFilters = hasAnyFilter || hasAnySelection

  const applyPatch = useCallback(
    (patch: {
      q?: string | null
      parent?: string | null
      sub?: string | null
    }) => {
      const next = toParams(searchParams)
      if (patch.q !== undefined) {
        const value = patch.q?.trim()
        if (value) next.set('q', value)
        else next.delete('q')
      }
      if (patch.parent !== undefined) {
        if (patch.parent) next.set('parent', patch.parent)
        else next.delete('parent')
      }
      if (patch.sub !== undefined) {
        if (patch.sub) next.set('sub', patch.sub)
        else next.delete('sub')
      }
      // Any filter change should restart the collection grid window from page 1.
      if (patch.q !== undefined || patch.parent !== undefined || patch.sub !== undefined) {
        next.delete(COLLECTIONS_CURSOR_PARAM)
      }
      const qs = next.toString()
      const href = qs ? `${pathname}?${qs}` : pathname
      startTransition(() => router.replace(href, { scroll: false }))
    },
    [pathname, router, searchParams]
  )

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (queryDraft.trim() === currentQuery.trim()) return
      applyPatch({ q: queryDraft })
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [applyPatch, currentQuery, queryDraft])

  function selectParent(parentId: string) {
    applyPatch({ parent: parentId, sub: null })
  }

  function removeSearch() {
    setQueryDraft('')
    applyPatch({ q: null })
  }

  function removeParent() {
    applyPatch({ parent: null, sub: null })
  }

  function removeSub() {
    applyPatch({ sub: null })
  }

  function clearAll() {
    setQueryDraft('')
    applyPatch({ q: null, parent: null, sub: null })
  }

  return (
    <>
      <div className="-mx-4 mb-4 border-b border-border bg-bg shadow-sm">
        <section className="px-4 py-2.5">
          <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
            <div className="flex flex-col gap-2.5">
              <header className="space-y-2 border-b border-border/80 pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">
                      Community Collections
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                      Curated discovery across topics, geographies, and podcast research themes.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-border bg-surface-raised px-2.5 py-1 text-muted">
                      {totalParents} Collections
                    </span>
                    <span className="rounded-full border border-border bg-surface-raised px-2.5 py-1 text-muted">
                      {totalChildren} sub-collections
                    </span>
                  </div>
                </div>
              </header>

              <label className="relative min-w-0">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <span className="sr-only">Search collections</span>
                <input
                  type="search"
                  value={queryDraft}
                  onChange={(event) => setQueryDraft(event.target.value)}
                  placeholder="Search by topic, theme, creator, or intent"
                  autoComplete="off"
                  className="h-9 w-full rounded-lg border border-border bg-surface-raised pl-9 pr-3 text-sm text-primary placeholder:text-muted shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus/60"
                />
              </label>

              {visibleParents.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {visibleParents.map((parent) => {
                    const active = selectedParentId === parent.id
                    return (
                      <button
                        key={parent.id}
                        type="button"
                        onClick={() => selectParent(parent.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          active
                            ? 'border-chip-active-border bg-chip-active-bg text-chip-active-text'
                            : 'border-border bg-surface-raised text-primary hover:bg-surface'
                        }`}
                      >
                        <span>{parent.title}</span>
                        <span className="tabular-nums text-[11px] opacity-75">({parent.count})</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {showActiveFilters && (
                <CollectionsActiveFilters
                  currentQuery={currentQuery}
                  selectedParentTitle={selectedParentTitle}
                  selectedSubTitle={selectedSubTitle}
                  isPending={isPending}
                  onRemoveSearch={removeSearch}
                  onRemoveParent={removeParent}
                  onRemoveSub={removeSub}
                  onClearAll={clearAll}
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
