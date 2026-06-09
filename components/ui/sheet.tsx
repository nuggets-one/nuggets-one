'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { lockScroll } from '@/lib/ui/scroll-lock'

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
 * - Desktop (`lg+`): right-anchored side panel.
 * - Mobile (`<lg`): full-height bottom sheet with safe-area insets.
 * - Background scroll: iOS-safe fixed-body lock via `lockScroll()`.
 * - Content scroll: inner body only (`overscroll-y-contain`).
 * - Dismiss: backdrop, Escape, close button, browser back, and swipe-down
 *   on the **drag handle** only (when content scroll is at top).
 */
export function Sheet({ children, ariaLabel }: Props) {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(false)

  const close = useCallback(() => {
    router.back()
  }, [router])

  const applyDragOffset = useCallback((offset: number) => {
    const panel = panelRef.current
    if (!panel) return
    if (offset > 0) {
      panel.style.transform = `translateY(${offset}px)`
    } else {
      panel.style.transform = ''
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-sheet-open', 'true')

    previouslyFocused.current = document.activeElement as HTMLElement | null
    const unlock = lockScroll()

    const raf = requestAnimationFrame(() => setMounted(true))

    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    focusables?.[0]?.focus()

    return () => {
      document.documentElement.removeAttribute('data-sheet-open')
      cancelAnimationFrame(raf)
      unlock()
      applyDragOffset(0)
      previouslyFocused.current?.focus?.()
    }
  }, [applyDragOffset])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key !== 'Tab') return

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
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

  // Mobile dismiss drag — handle only, non-passive touchmove for preventDefault.
  useEffect(() => {
    const handle = handleRef.current
    if (!handle) return

    let startY = 0
    let offset = 0
    let dragging = false

    function canDismissFromScroll(): boolean {
      return (bodyRef.current?.scrollTop ?? 0) <= 0
    }

    function onTouchStart(e: TouchEvent) {
      if (!canDismissFromScroll()) return
      dragging = true
      startY = e.touches[0]?.clientY ?? 0
      offset = 0
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragging) return
      const y = e.touches[0]?.clientY ?? startY
      const dy = y - startY
      if (dy <= 0) return
      e.preventDefault()
      offset = dy
      applyDragOffset(offset)
    }

    function onTouchEnd() {
      if (!dragging) return
      dragging = false
      if (offset > SWIPE_DISMISS_THRESHOLD) {
        close()
      } else {
        applyDragOffset(0)
      }
      offset = 0
    }

    handle.addEventListener('touchstart', onTouchStart, { passive: true })
    handle.addEventListener('touchmove', onTouchMove, { passive: false })
    handle.addEventListener('touchend', onTouchEnd)
    handle.addEventListener('touchcancel', onTouchEnd)

    return () => {
      handle.removeEventListener('touchstart', onTouchStart)
      handle.removeEventListener('touchmove', onTouchMove)
      handle.removeEventListener('touchend', onTouchEnd)
      handle.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [applyDragOffset, close])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? 'Nugget detail'}
      className="fixed inset-0 z-[80] flex items-end justify-end overscroll-none lg:items-stretch"
    >
      <button
        type="button"
        aria-label="Dismiss nugget detail"
        onClick={close}
        className="absolute inset-0 bg-scrim motion-safe:transition-opacity motion-safe:duration-200"
      />

      <div
        ref={panelRef}
        data-mounted={mounted ? 'true' : 'false'}
        className="relative flex h-[100dvh] w-full max-w-full flex-col overflow-hidden rounded-none border border-border bg-surface text-primary shadow-panel ring-1 ring-elevated motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out max-lg:pt-[env(safe-area-inset-top)] max-lg:pb-[env(safe-area-inset-bottom)] translate-y-full data-[mounted=true]:translate-y-0 sm:max-w-[420px] lg:h-full lg:max-w-[500px] lg:translate-y-0 lg:translate-x-full lg:border-b-0 lg:border-r-0 lg:border-t-0 lg:data-[mounted=true]:translate-x-0 motion-reduce:!translate-y-0 lg:motion-reduce:!translate-x-0 motion-reduce:transition-none"
      >
        <div
          ref={handleRef}
          data-sheet-handle
          className="flex shrink-0 touch-none justify-center px-4 pb-1 pt-2 lg:hidden"
          aria-hidden="true"
        >
          <span className="h-1.5 w-12 rounded-full bg-border" />
        </div>

        <div
          ref={bodyRef}
          data-sheet-body
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] max-lg:pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
          style={{ touchAction: 'pan-y' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
