'use client'

import { Check } from 'lucide-react'
import { useMemo, useTransition } from 'react'
import { useQueryState } from 'nuqs'
import type { TagSummary } from '@/types/article'
import type { TagCounts } from '@/lib/queries/tag-counts'
import { FilterPopover } from '@/components/feed/filter-popover'

type Props = {
  tags: TagSummary[]
  counts: TagCounts
}

/**
 * Minimal feed filter chrome: All + More filters (mega-panel dialog).
 * Tag taxonomy lives only inside the dialog — not on the landing surface.
 */
export function FeedTaxonomyFilters({ tags, counts }: Props) {
  const [tagsRaw, setSelected] = useQueryState('tags', {
    defaultValue: '',
    shallow: false,
  })
  const [isPending, startTransition] = useTransition()
  const selected = useMemo(
    () => (tagsRaw ? tagsRaw.split(',').filter(Boolean) : []),
    [tagsRaw]
  )
  const hasActiveTags = selected.length > 0

  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={() =>
          startTransition(() => {
            setSelected(null)
          })
        }
        aria-pressed={!hasActiveTags}
        disabled={isPending || !hasActiveTags}
        className={
          !hasActiveTags
            ? 'inline-flex min-h-[36px] shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-chip-active-border bg-chip-active-bg px-4 py-1.5 text-xs font-semibold tracking-wide text-chip-active-text shadow-chip-active ring-1 ring-inset ring-focus/20 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1'
            : 'inline-flex min-h-[36px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-chip-inactive-border bg-transparent px-4 py-1.5 text-xs font-semibold tracking-wide text-chip-inactive-text transition-colors hover:bg-chip-hover-bg hover:text-chip-hover-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1'
        }
      >
        {!hasActiveTags && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
        <span>All</span>
      </button>
      <FilterPopover tags={tags} counts={counts} idleTriggerLabel="More filters" />
    </div>
  )
}
