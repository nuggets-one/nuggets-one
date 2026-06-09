'use client'

import { LayoutGrid, List } from 'lucide-react'
import { useEffect, useRef, useTransition } from 'react'
import { useQueryState } from 'nuqs'
import {
  FEED_VIEW_STORAGE_KEY,
  persistFeedViewPreference,
} from '@/lib/feed/feed-view'

const segmentBase =
  'inline-flex min-h-[32px] min-w-[44px] flex-1 items-center justify-center rounded-md px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1 disabled:opacity-60'

export function FeedViewToggle() {
  const [view, setView] = useQueryState('view', {
    defaultValue: '',
    shallow: false,
  })
  const [isPending, startTransition] = useTransition()
  const hydratedRef = useRef(false)

  const isSkim = view !== 'grid'

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true

    if (view) return

    try {
      const stored = localStorage.getItem(FEED_VIEW_STORAGE_KEY)
      if (stored === 'grid') {
        startTransition(() => {
          void setView('grid')
        })
      }
    } catch {
      // localStorage unavailable — server default skim applies
    }
  }, [view, setView])

  function select(next: 'grid' | 'skim') {
    startTransition(() => {
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
        className={
          !isSkim
            ? `${segmentBase} bg-surface text-primary shadow-sm`
            : `${segmentBase} text-muted hover:text-primary`
        }
      >
        <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-pressed={isSkim}
        aria-label="Skim view"
        disabled={isPending}
        onClick={() => select('skim')}
        className={
          isSkim
            ? `${segmentBase} bg-surface text-primary shadow-sm`
            : `${segmentBase} text-muted hover:text-primary`
        }
      >
        <List className="size-4 shrink-0" aria-hidden="true" />
      </button>
    </div>
  )
}
