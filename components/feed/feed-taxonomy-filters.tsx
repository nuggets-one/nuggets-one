'use client'

import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { useQueryState } from 'nuqs'
import type { TagSummary } from '@/types/article'
import type { TagCounts } from '@/lib/queries/tag-counts'
import {
  FEED_DIMENSION_KEYS,
  filterTagsVisibleInPicker,
  groupedSortedByCount,
} from '@/lib/feed/group-official-tags'
import { FilterPopover } from '@/components/feed/filter-popover'

type Props = {
  tags: TagSummary[]
  counts: TagCounts
}

function RailDivider() {
  return (
    <span
      className="h-7 w-px shrink-0 self-center bg-border"
      aria-hidden="true"
    />
  )
}

function tagPillClasses(active: boolean) {
  return active
    ? 'inline-flex min-h-[36px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-chip-active-border bg-chip-active-bg px-3 py-1.5 text-xs font-semibold tracking-wide text-chip-active-text shadow-chip-active ring-1 ring-inset ring-focus/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1'
    : 'inline-flex min-h-[36px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-chip-inactive-border bg-transparent px-3 py-1.5 text-xs font-semibold tracking-wide text-chip-inactive-text transition-colors hover:bg-chip-hover-bg hover:text-chip-hover-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1'
}

const scrollArrowBtn =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-primary transition-colors hover:bg-surface-raised/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-35'

/**
 * Feed filter chrome: All + scrollable dimension quick rail (format | domain | subtopic)
 * + More filters dialog for full taxonomy.
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

  const grouped = useMemo(() => groupedSortedByCount(tags, counts), [tags, counts])

  const dimensionBlocks = useMemo(
    () =>
      FEED_DIMENSION_KEYS.map((key) => ({
        key,
        tags: filterTagsVisibleInPicker(grouped[key], counts, selected),
      })).filter((b) => b.tags.length > 0),
    [grouped, counts, selected]
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({
    overflow: false,
    canLeft: false,
    canRight: false,
  })

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      setScrollState({ overflow: false, canLeft: false, canRight: false })
      return
    }
    const { scrollLeft, scrollWidth, clientWidth } = el
    const overflow = scrollWidth > clientWidth + 1
    setScrollState({
      overflow,
      canLeft: overflow && scrollLeft > 1,
      canRight: overflow && scrollLeft < scrollWidth - clientWidth - 1,
    })
  }, [])

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return undefined
    el.addEventListener('scroll', updateScrollState, { passive: true })
    const ro = new ResizeObserver(() => {
      updateScrollState()
    })
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      ro.disconnect()
    }
  }, [dimensionBlocks, updateScrollState])

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    const delta = Math.max(160, Math.floor(el.clientWidth * 0.65)) * dir
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  const toggleSlug = (slug: string) => {
    startTransition(() => {
      const next = selected.includes(slug)
        ? selected.filter((s) => s !== slug)
        : [...selected, slug]
      setSelected(next.length > 0 ? next.join(',') : null)
    })
  }

  if (tags.length === 0) return null

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
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

        {dimensionBlocks.length > 0 ? <RailDivider /> : null}

        {scrollState.overflow ? (
          <button
            type="button"
            className={scrollArrowBtn}
            aria-label="Scroll tags left"
            disabled={!scrollState.canLeft}
            onClick={() => scrollByDir(-1)}
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
          </button>
        ) : null}

        <div
          ref={scrollRef}
          className="flex min-h-[36px] min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {dimensionBlocks.map((block, idx) => (
            <Fragment key={block.key}>
              {idx > 0 ? <RailDivider /> : null}
              <div className="flex shrink-0 items-center gap-2">
                {block.tags.map((tag) => {
                  const active = selected.includes(tag.slug)
                  return (
                    <button
                      key={tag.slug}
                      type="button"
                      onClick={() => toggleSlug(tag.slug)}
                      disabled={isPending}
                      aria-pressed={active}
                      className={tagPillClasses(active)}
                    >
                      {tag.label}
                    </button>
                  )
                })}
              </div>
            </Fragment>
          ))}
        </div>

        {scrollState.overflow ? (
          <button
            type="button"
            className={scrollArrowBtn}
            aria-label="Scroll tags right"
            disabled={!scrollState.canRight}
            onClick={() => scrollByDir(1)}
          >
            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="flex shrink-0 justify-end sm:justify-start">
        <FilterPopover tags={tags} counts={counts} idleTriggerLabel="More filters" />
      </div>
    </div>
  )
}
