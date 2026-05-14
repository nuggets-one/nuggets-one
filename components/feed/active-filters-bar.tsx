'use client'

import { useMemo, useTransition } from 'react'
import { useQueryState } from 'nuqs'
import type { TagSummary } from '@/types/article'

type Props = {
  tags: TagSummary[]
}

export function ActiveFiltersBar({ tags }: Props) {
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

  const labelFor = (slug: string) =>
    tags.find((t) => t.slug === slug)?.label ?? slug

  function removeTag(slug: string) {
    const next = selectedSlugs.filter((s) => s !== slug)
    startTransition(() => {
      setTagsParam(next.length ? next.join(',') : null)
    })
  }

  function clearQuery() {
    startTransition(() => {
      setQ(null)
    })
  }

  function clearAll() {
    startTransition(() => {
      setTagsParam(null)
      setQ(null)
    })
  }

  return (
    <div
      role="region"
      aria-label="Active filters"
      className="flex flex-wrap items-center gap-1.5"
    >
      <span className="text-[11px] uppercase tracking-wide text-muted">Filters</span>

      {q && (
        <button
          type="button"
          onClick={clearQuery}
          disabled={isPending}
          aria-label={`Remove search filter ${q}`}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:border-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 disabled:opacity-60"
        >
          <span>Search: &ldquo;{q}&rdquo;</span>
          <span aria-hidden="true" className="text-muted">×</span>
        </button>
      )}

      {selectedSlugs.map((slug) => (
        <button
          key={slug}
          type="button"
          onClick={() => removeTag(slug)}
          disabled={isPending}
          aria-label={`Remove ${labelFor(slug)} filter`}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:border-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 disabled:opacity-60"
        >
          <span>{labelFor(slug)}</span>
          <span aria-hidden="true" className="text-muted">×</span>
        </button>
      ))}

      <button
        type="button"
        onClick={clearAll}
        disabled={isPending}
        className="rounded text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 disabled:opacity-60 sm:ml-auto"
      >
        Clear all
      </button>
    </div>
  )
}
