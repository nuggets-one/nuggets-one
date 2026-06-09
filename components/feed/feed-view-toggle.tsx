'use client'

import { LayoutGrid, List } from 'lucide-react'
import { useEffect, useRef, useTransition } from 'react'
import { useQueryState } from 'nuqs'
import { FEED_VIEW_STORAGE_KEY } from '@/lib/feed/feed-view'

const toggleBtn =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1'

export function FeedViewToggle() {
  const [view, setView] = useQueryState('view', {
    defaultValue: '',
    shallow: false,
  })
  const [isPending, startTransition] = useTransition()
  const hydratedRef = useRef(false)

  const isSkim = view === 'skim'

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true

    if (view) return

    try {
      const stored = localStorage.getItem(FEED_VIEW_STORAGE_KEY)
      if (stored === 'skim') {
        startTransition(() => {
          void setView('skim')
        })
      }
    } catch {
      // localStorage unavailable — keep default grid
    }
  }, [view, setView])

  function select(next: 'grid' | 'skim') {
    startTransition(() => {
      void setView(next === 'skim' ? 'skim' : null)
      try {
        localStorage.setItem(FEED_VIEW_STORAGE_KEY, next)
      } catch {
        // ignore
      }
    })
  }

  return (
    <div
      className="flex shrink-0 items-center gap-1 md:hidden"
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
            ? `${toggleBtn} border-chip-active-border bg-chip-active-bg text-chip-active-text shadow-chip-active ring-1 ring-inset ring-focus/20`
            : `${toggleBtn} border-chip-inactive-border bg-transparent text-chip-inactive-text hover:bg-chip-hover-bg hover:text-chip-hover-text`
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
            ? `${toggleBtn} border-chip-active-border bg-chip-active-bg text-chip-active-text shadow-chip-active ring-1 ring-inset ring-focus/20`
            : `${toggleBtn} border-chip-inactive-border bg-transparent text-chip-inactive-text hover:bg-chip-hover-bg hover:text-chip-hover-text`
        }
      >
        <List className="size-4 shrink-0" aria-hidden="true" />
      </button>
    </div>
  )
}
