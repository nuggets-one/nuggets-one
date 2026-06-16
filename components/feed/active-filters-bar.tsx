'use client'

import { useMemo } from 'react'
import { useQueryState } from 'nuqs'
import { useFeedPending } from '@/components/feed/feed-pending-context'

export function ActiveFiltersBar() {
  const [tagsRaw, setTagsParam] = useQueryState('tags', {
    defaultValue: '',
    shallow: false,
  })
  const [q, setQ] = useQueryState('q', { defaultValue: '', shallow: false })
  const { beginFeedTransition, showFeedSkeleton } = useFeedPending()
  const isPending = showFeedSkeleton

  const selectedSlugs = useMemo(
    () => (tagsRaw ? tagsRaw.split(',').filter(Boolean) : []),
    [tagsRaw]
  )

  const hasFilters = selectedSlugs.length > 0 || q.length > 0
  if (!hasFilters) return null

  function clearAll() {
    beginFeedTransition(() => {
      setTagsParam(null)
      setQ(null)
    })
  }

  const totalFilters = selectedSlugs.length + (q.length > 0 ? 1 : 0)
  const hasSearchQuery = q.trim().length > 0

  return (
    <div
      role="region"
      aria-label="Active filters"
      className="flex min-h-9 items-center justify-between gap-3"
    >
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-xs text-muted">
          <span className="font-semibold text-primary">{totalFilters}</span> filters applied
        </p>
        {hasSearchQuery && (
          <button
            type="button"
            onClick={() =>
              beginFeedTransition(() => {
                setQ(null)
              })
            }
            disabled={isPending}
            className="inline-flex max-w-[16rem] items-center gap-1 rounded-full border border-border bg-surface-raised px-2 py-1 text-[11px] text-primary transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 disabled:opacity-60"
            aria-label={`Remove search query ${q}`}
            title={q}
          >
            <span className="truncate">q: {q}</span>
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

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
