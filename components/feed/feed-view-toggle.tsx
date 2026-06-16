'use client'

import { LayoutGrid, List } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useQueryState } from 'nuqs'
import {
  FEED_VIEW_STORAGE_KEY,
  persistFeedViewPreference,
} from '@/lib/feed/feed-view'
import { useFeedPending } from '@/components/feed/feed-pending-context'

const segmentBase =
  'inline-flex min-h-[32px] min-w-[44px] flex-1 items-center justify-center rounded-md border border-transparent px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1 disabled:opacity-60'

const segmentActive =
  'border-chip-active-border bg-chip-active-bg text-chip-active-text shadow-chip-active ring-1 ring-inset ring-focus/20'

const segmentInactive =
  'text-muted hover:bg-chip-hover-bg hover:text-chip-hover-text'

export function FeedViewToggle() {
  const [view, setView] = useQueryState('view', {
    defaultValue: '',
    shallow: false,
  })
  const { beginFeedTransition, showFeedSkeleton } = useFeedPending()
  const isPending = showFeedSkeleton
  const hydratedRef = useRef(false)

  const isSkim = view !== 'grid'

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true

    if (view) return

    try {
      const stored = localStorage.getItem(FEED_VIEW_STORAGE_KEY)
      if (stored === 'grid') {
        void setView('grid')
      }
    } catch {
      // localStorage unavailable — server default skim applies
    }
  }, [view, setView])

  function select(next: 'grid' | 'skim') {
    beginFeedTransition(() => {
      void setView(next === 'grid' ? 'grid' : null)
      persistFeedViewPreference(next)
    })
  }

  return (
    <div
      className="inline-flex h-9 shrink-0 items-center rounded-lg bg-surface-raised p-1 ring-1 ring-inset ring-border/60 md:hidden"
      role="group"
      aria-label="Feed layout"
    >
      <button
        type="button"
        aria-pressed={!isSkim}
        aria-label="Card view"
        disabled={isPending}
        onClick={() => select('grid')}
        className={`${segmentBase} ${!isSkim ? segmentActive : segmentInactive}`}
      >
        <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-pressed={isSkim}
        aria-label="Skim view"
        disabled={isPending}
        onClick={() => select('skim')}
        className={`${segmentBase} ${isSkim ? segmentActive : segmentInactive}`}
      >
        <List className="size-4 shrink-0" aria-hidden="true" />
      </button>
    </div>
  )
}
