'use client'

import { useQueryState } from 'nuqs'
import { useTransition } from 'react'
import type { TagSummary } from '@/types/article'

type Props = {
  tags: TagSummary[]
}

export function TagChipRail({ tags }: Props) {
  const [selectedRaw, setSelected] = useQueryState('tags', {
    defaultValue: '',
    shallow: false,
  })
  const [isPending, startTransition] = useTransition()

  const selected = selectedRaw
    ? selectedRaw.split(',').filter(Boolean)
    : []

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
    <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by topic">
      {tags.map((tag) => {
        const active = selected.includes(tag.slug)
        return (
          <button
            key={tag.slug}
            onClick={() => toggle(tag.slug)}
            aria-pressed={active}
            disabled={isPending}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors min-h-[44px] ${
              active
                ? 'bg-accent text-black ring-1 ring-accent/70 active:brightness-95'
                : 'bg-surface-raised text-muted hover:text-primary hover:bg-surface active:bg-surface border border-border'
            }`}
          >
            {tag.label}
          </button>
        )
      })}
    </div>
  )
}
