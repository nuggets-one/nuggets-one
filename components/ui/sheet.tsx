'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  children: React.ReactNode
  ariaLabel?: string
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

const SWIPE_DISMISS_THRESHOLD = 80

/**
 * Nugget detail sheet — alternate shell for the canonical
 * /nuggets/[id]/[slug] route.
 *
 * - Desktop (`lg+`): right-anchored side panel, ~640px wide.
 * - Mobile (`<lg`): bottom sheet, full dynamic viewport (`100dvh`) with safe-area insets.
 * - `Escape` and backdrop click → `router.back()` (closes the slot, restores
 *   the underlying route + scroll position).
 * - Touch swipe-down on the mobile sheet exceeding 80px dismisses.
 * - `motion-reduce:` snaps without slide.
 * - Scroll locked on the underlying body while open; restored on close.
 */
export function Sheet({ children, ariaLabel }: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  // Two-frame mount → enables transform transition from off-screen → in-place.
  // motion-reduce class on the panel suppresses the transform entirely.
  const [mounted, setMounted] = useState(false)

  const close = useCallback(() => {
    router.back()
  }, [router])

  // Lock body scroll while the sheet is mounted; capture prior focus to restore.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const raf = requestAnimationFrame(() => setMounted(true))

    const focusables = containerRef.current?.querySelectorAll<HTMLElement>(
      FOCUSABLE_SELECTOR
    )
    focusables?.[0]?.focus()

    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = prevOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key !== 'Tab') return

      // Focus trap — keep tab cycle inside the sheet.
      const focusables = containerRef.current?.querySelectorAll<HTMLElement>(
        FOCUSABLE_SELECTOR
      )
      if (!focusables || focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    setTouchStartY(e.touches[0]?.clientY ?? null)
    setDragOffset(0)
  }

  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (touchStartY == null) return
    const dy = (e.touches[0]?.clientY ?? touchStartY) - touchStartY
    if (dy > 0) setDragOffset(dy)
  }

  function onTouchEnd() {
    if (dragOffset > SWIPE_DISMISS_THRESHOLD) {
      close()
    } else {
      setDragOffset(0)
    }
    setTouchStartY(null)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? 'Nugget detail'}
      className="fixed inset-0 z-50 flex items-end justify-end lg:items-stretch"
    >
      <button
        type="button"
        aria-label="Dismiss nugget detail"
        onClick={close}
        className="absolute inset-0 bg-scrim motion-safe:transition-opacity motion-safe:duration-200"
      />

      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)` } : undefined}
        data-mounted={mounted ? 'true' : 'false'}
        className="relative flex h-[100dvh] max-lg:pt-[env(safe-area-inset-top)] max-lg:pb-[env(safe-area-inset-bottom)] w-full flex-col overflow-y-auto rounded-none border border-border bg-surface text-primary shadow-panel ring-1 ring-elevated motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out translate-y-full data-[mounted=true]:translate-y-0 sm:max-w-[420px] lg:h-full lg:max-w-[500px] lg:border-b-0 lg:border-r-0 lg:border-t-0 lg:translate-y-0 lg:translate-x-full lg:data-[mounted=true]:translate-x-0 motion-reduce:!translate-y-0 lg:motion-reduce:!translate-x-0 motion-reduce:transition-none"
      >
        <div className="flex justify-center px-4 pb-1 pt-2 lg:hidden" aria-hidden="true">
          <span className="h-1.5 w-12 rounded-full bg-border" />
        </div>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
