'use client'

import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useQueryState } from 'nuqs'
import { useFeedPending } from '@/components/feed/feed-pending-context'
import type { TagSummary } from '@/types/article'
import type { ContentStream } from '@/types/article'
import type { TagCounts } from '@/lib/queries/tag-counts'
import {
  FEED_DIMENSION_KEYS,
  filterTagsVisibleInPicker,
  groupedSortedByCount,
} from '@/lib/feed/group-official-tags'
import {
  INDIA_SUBTOPIC_SLUG,
  shouldHideIndiaTagSlug,
} from '@/lib/feed/scope'
import { shouldHideTagSlugForStream } from '@/lib/feed/stream-membership'
import { FilterPopover } from '@/components/feed/filter-popover'
import { FeedViewToggle } from '@/components/feed/feed-view-toggle'

type Props = {
  stream: ContentStream
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
    ? 'inline-flex min-h-[36px] max-w-[9.5rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-chip-active-border bg-chip-active-bg px-4 py-1.5 text-xs font-semibold tracking-[0.01em] text-chip-active-text shadow-chip-active ring-1 ring-inset ring-focus/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1'
    : 'inline-flex min-h-[36px] max-w-[9.5rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-chip-inactive-border bg-transparent px-4 py-1.5 text-xs font-semibold tracking-[0.01em] text-chip-inactive-text transition-colors hover:bg-chip-hover-bg hover:text-chip-hover-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1'
}

const scrollArrowBtn =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-primary transition-colors hover:bg-surface-raised/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-35'

/**
 * Feed filter chrome: All + scrollable dimension quick rail (format | domain | subtopic | source)
 * + More filters dialog for full taxonomy.
 */
export function FeedTaxonomyFilters({ stream, tags, counts }: Props) {
  const [tagsRaw, setSelected] = useQueryState('tags', {
    defaultValue: '',
    shallow: false,
  })
  const { beginFeedTransition, showFeedSkeleton } = useFeedPending()
  const isPending = showFeedSkeleton
  const selected = useMemo(
    () => (tagsRaw ? tagsRaw.split(',').filter(Boolean) : []),
    [tagsRaw]
  )
  const hasActiveTags = selected.length > 0

  const visibleTags = useMemo(() => {
    return tags.filter((t) => {
      if (shouldHideIndiaTagSlug(stream) && t.slug === INDIA_SUBTOPIC_SLUG) {
        return false
      }
      return !shouldHideTagSlugForStream(stream, t.slug)
    })
  }, [tags, stream])

  const grouped = useMemo(
    () => groupedSortedByCount(visibleTags, counts),
    [visibleTags, counts]
  )

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
    beginFeedTransition(() => {
      const next = selected.includes(slug)
        ? selected.filter((s) => s !== slug)
        : [...selected, slug]
      setSelected(next.length > 0 ? next.join(',') : null)
    })
  }

  if (visibleTags.length === 0) return null

  return (
    <div className="flex min-h-11 min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={() =>
          beginFeedTransition(() => {
            setSelected(null)
          })
        }
        aria-pressed={!hasActiveTags}
        disabled={isPending || !hasActiveTags}
        className={
          !hasActiveTags
            ? 'inline-flex min-h-[36px] shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-chip-active-border bg-chip-active-bg px-4 py-1.5 text-xs font-semibold tracking-[0.01em] text-chip-active-text shadow-chip-active ring-1 ring-inset ring-focus/20 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1'
            : 'inline-flex min-h-[36px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-chip-inactive-border bg-transparent px-4 py-1.5 text-xs font-semibold tracking-[0.01em] text-chip-inactive-text transition-colors hover:bg-chip-hover-bg hover:text-chip-hover-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1'
        }
      >
        {!hasActiveTags && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
        <span>All</span>
      </button>

      {dimensionBlocks.length > 0 ? <RailDivider /> : null}

      {scrollState.overflow ? (
        <button
          type="button"
          className={`${scrollArrowBtn} hidden sm:inline-flex`}
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
                    <span className="truncate">{tag.label}</span>
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
          className={`${scrollArrowBtn} hidden sm:inline-flex`}
          aria-label="Scroll tags right"
          disabled={!scrollState.canRight}
          onClick={() => scrollByDir(1)}
        >
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
        </button>
      ) : null}

      <RailDivider />

      <FeedViewToggle />

      <div className="shrink-0">
        <FilterPopover
          tags={visibleTags}
          counts={counts}
          idleTriggerLabel="More filters"
          triggerVariant="iconCount"
        />
      </div>
    </div>
  )
}
