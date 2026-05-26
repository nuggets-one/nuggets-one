'use client'

import { useMemo, useTransition } from 'react'
import { useQueryState } from 'nuqs'

export function ActiveFiltersBar() {
  const [tagsRaw, setTagsParam] = useQueryState('tags', {
    defaultValue: '',
    shallow: false,
  })
  const [q, setQ] = useQueryState('q', { defaultValue: '', shallow: false })
  const [isPending, startTransition] = useTransition()

  const selectedSlugs = useMemo(
    () => (tagsRaw ? tagsRaw.split(',').filter(Boolean) : []),
    [tagsRaw]
  )

  const hasFilters = selectedSlugs.length > 0 || q.length > 0
  if (!hasFilters) return null

  function clearAll() {
    startTransition(() => {
      setTagsParam(null)
      setQ(null)
    })
  }

  const totalFilters = selectedSlugs.length + (q.length > 0 ? 1 : 0)

  return (
    <div
      role="region"
      aria-label="Active filters"
      className="flex min-h-9 items-center justify-between gap-3"
    >
      <p className="truncate text-xs text-muted">
        <span className="font-semibold text-primary">{totalFilters}</span> filters applied
      </p>

      <button
        type="button"
        onClick={clearAll}
        disabled={isPending}
        className="shrink-0 rounded text-xs font-semibold tracking-[0.01em] text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 disabled:opacity-60"
      >
        Clear all
      </button>
    </div>
  )
}
