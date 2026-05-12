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
  const hasActiveTags = selected.length > 0

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
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <div
          ref={scrollerRef}
          role="group"
          aria-label="Filter by topic"
          className="-mx-1 flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden px-1 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            onClick={() =>
              startTransition(() => {
                setSelected(null)
              })
            }
            aria-pressed={!hasActiveTags}
            disabled={isPending || !hasActiveTags}
            className={
              !hasActiveTags
                ? 'inline-flex items-center gap-1 rounded-full border border-chip-active-border bg-chip-active-bg px-3 py-1 text-xs font-medium text-chip-active-text shadow-chip-active cursor-default shrink-0'
                : 'inline-flex items-center rounded-full border border-chip-inactive-border bg-transparent px-3 py-1 text-xs font-medium text-chip-inactive-text hover:bg-chip-hover-bg hover:text-chip-hover-text cursor-pointer shrink-0'
            }
          >
            {!hasActiveTags && <span aria-hidden="true">✓</span>}
            <span>All</span>
          </button>
          {tags.map((tag) => {
            const active = selected.includes(tag.slug)
            return (
              <button
                key={tag.slug}
                onClick={() => toggle(tag.slug)}
                aria-pressed={active}
                disabled={isPending}
                className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 ${
                  active
                    ? 'inline-flex items-center gap-1 rounded-full border border-chip-active-border bg-chip-active-bg px-3 py-1 text-xs font-medium text-chip-active-text shadow-chip-active cursor-default shrink-0'
                    : 'inline-flex items-center rounded-full border border-chip-inactive-border bg-transparent px-3 py-1 text-xs font-medium text-chip-inactive-text hover:bg-chip-hover-bg hover:text-chip-hover-text cursor-pointer shrink-0'
                }`}
              >
                {active && <span aria-hidden="true">✓</span>}
                <span>{tag.label}</span>
              </button>
            )
          })}
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
      <FilterPopover tags={tags} counts={counts ?? {}} />
    </div>
  )
}
