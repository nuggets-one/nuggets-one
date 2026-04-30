'use client'

import { useQueryState } from 'nuqs'
import { useMemo, useState, useTransition } from 'react'
import type { TagSummary } from '@/types/article'

type Props = {
  tags: TagSummary[]
}

const COLLAPSED_TAG_LIMIT = 12

export function TagChipRail({ tags }: Props) {
  const [selectedRaw, setSelected] = useQueryState('tags', {
    defaultValue: '',
    shallow: false,
  })
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  const selected = useMemo(
    () => (selectedRaw ? selectedRaw.split(',').filter(Boolean) : []),
    [selectedRaw]
  )

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const visibleTags = useMemo(() => {
    if (expanded || tags.length <= COLLAPSED_TAG_LIMIT) {
      return tags
    }

    const selectedTags = tags.filter((tag) => selectedSet.has(tag.slug))
    const selectedSlugs = new Set(selectedTags.map((tag) => tag.slug))
    const remainingTags = tags.filter((tag) => !selectedSlugs.has(tag.slug))
    const remainingCount = Math.max(0, COLLAPSED_TAG_LIMIT - selectedTags.length)

    return [...selectedTags, ...remainingTags.slice(0, remainingCount)]
  }, [expanded, selectedSet, tags])
  const hiddenCount = Math.max(0, tags.length - visibleTags.length)

  function toggle(slug: string) {
    const next = selected.includes(slug)
      ? selected.filter((s) => s !== slug)
      : [...selected, slug]
    startTransition(() => {
      setSelected(next.length ? next.join(',') : null)
    })
  }

  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by topic">
      {visibleTags.map((tag) => {
        const active = selected.includes(tag.slug)
        return (
          <button
            key={tag.slug}
            onClick={() => toggle(tag.slug)}
            aria-pressed={active}
            disabled={isPending}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors min-h-[44px] min-w-[44px] ${
              active
                ? 'bg-accent text-black ring-1 ring-accent/70 active:brightness-95'
                : 'bg-surface-raised text-muted hover:text-primary hover:bg-surface active:bg-surface border border-border'
            }`}
          >
            {tag.label}
          </button>
        )
      })}
      {tags.length > COLLAPSED_TAG_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="min-h-[44px] rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium text-muted transition-colors hover:text-primary hover:bg-surface-raised active:bg-surface-raised"
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : `Show more (${hiddenCount})`}
        </button>
      )}
    </div>
  )
}
