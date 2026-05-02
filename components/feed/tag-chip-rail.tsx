'use client'

import { useQueryState } from 'nuqs'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { TagSummary } from '@/types/article'
import type { TagCounts } from '@/lib/queries/tag-counts'
import { FilterPopover } from '@/components/feed/filter-popover'

type Props = {
  tags: TagSummary[]
  counts?: TagCounts
}

export function TagChipRail({ tags, counts }: Props) {
  const [selectedRaw, setSelected] = useQueryState('tags', {
    defaultValue: '',
    shallow: false,
  })
  const [isPending, startTransition] = useTransition()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  const selected = useMemo(
    () => (selectedRaw ? selectedRaw.split(',').filter(Boolean) : []),
    [selectedRaw]
  )

  function toggle(slug: string) {
    const next = selected.includes(slug)
      ? selected.filter((s) => s !== slug)
      : [...selected, slug]
    startTransition(() => {
      setSelected(next.length ? next.join(',') : null)
    })
  }

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const update = () => {
      const overflowing = el.scrollWidth > el.clientWidth + 1
      setShowLeftFade(overflowing && el.scrollLeft > 4)
      setShowRightFade(
        overflowing && el.scrollLeft + el.clientWidth < el.scrollWidth - 4
      )
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [tags.length])

  if (tags.length === 0) return null

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        role="group"
        aria-label="Filter by topic"
        className="-mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden px-1 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tags.map((tag) => {
          const active = selected.includes(tag.slug)
          return (
            <button
              key={tag.slug}
              onClick={() => toggle(tag.slug)}
              aria-pressed={active}
              disabled={isPending}
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 md:min-h-10 ${
                active
                  ? 'bg-accent text-black ring-1 ring-accent/70 active:brightness-95'
                  : 'bg-surface-raised text-muted hover:text-primary hover:bg-surface active:bg-surface border border-border'
              }`}
            >
              {tag.label}
            </button>
          )
        })}
        <FilterPopover tags={tags} counts={counts ?? {}} />
      </div>
      {showLeftFade && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-bg to-transparent"
        />
      )}
      {showRightFade && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bg to-transparent"
        />
      )}
    </div>
  )
}
