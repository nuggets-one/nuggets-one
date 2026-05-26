'use client'

import { useMemo, useTransition } from 'react'
import { useQueryState } from 'nuqs'
import type { TagSummary } from '@/types/article'

type Props = {
  tags: TagSummary[]
}

const MAX_VISIBLE_CHIPS = 2

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
  const labelBySlug = useMemo(() => {
    const map = new Map<string, string>()
    for (const tag of tags) map.set(tag.slug, tag.label)
    return map
  }, [tags])

  const hasFilters = selectedSlugs.length > 0 || q.length > 0
  if (!hasFilters) return null

  const labelFor = (slug: string) => labelBySlug.get(slug) ?? slug

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

  const chips: Array<{ key: string; label: string; remove: () => void; ariaLabel: string }> = []
  if (q) {
    chips.push({
      key: `q:${q}`,
      label: `Search: "${q}"`,
      remove: clearQuery,
      ariaLabel: `Remove search filter ${q}`,
    })
  }
  for (const slug of selectedSlugs) {
    const name = labelFor(slug)
    chips.push({
      key: `tag:${slug}`,
      label: name,
      remove: () => removeTag(slug),
      ariaLabel: `Remove ${name} filter`,
    })
  }

  const visibleChips = chips.slice(0, MAX_VISIBLE_CHIPS)
  const hiddenCount = Math.max(0, chips.length - visibleChips.length)

  return (
    <div
      role="region"
      aria-label="Active filters"
      className="flex min-h-11 min-w-0 items-center gap-2"
    >
      <span className="hidden text-[10px] font-medium uppercase tracking-[0.11em] text-muted sm:inline">
        Filters
      </span>

      <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-h-9 items-center gap-1.5 whitespace-nowrap pr-1">
          {visibleChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.remove}
              disabled={isPending}
              aria-label={chip.ariaLabel}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:border-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 disabled:opacity-60"
            >
              <span className="truncate">{chip.label}</span>
              <span aria-hidden="true" className="text-muted">
                ×
              </span>
            </button>
          ))}
          {hiddenCount > 0 ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-muted">
              +{hiddenCount} more
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={clearAll}
        disabled={isPending}
        className="shrink-0 rounded text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 disabled:opacity-60"
      >
        Clear all
      </button>
    </div>
  )
}
