'use client'

import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useMobileSearchExpanded } from '@/components/layout/mobile-search-context'
import { YOUTUBE_FEED_PLAY_EVENT } from '@/lib/ui/youtube-feed-play'
import {
  ensureScrollTopSentinel,
  getActiveScrollRoot,
  getMiniPlayerDockSide,
  isBlockingOverlayOpen,
  isMiniPlayerVisible,
  isScrollToTopRouteEnabled,
  isSheetOpen,
  scrollToTop,
} from '@/lib/ui/scroll-to-top'

const SCROLL_SHOW_THRESHOLD_PX = 400

function ChevronUpIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  )
}

export function ScrollToTopButton() {
  const pathname = usePathname() ?? ''
  const isSearchExpanded = useMobileSearchExpanded()
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const [showButton, setShowButton] = useState(false)
  const [hasSheet, setHasSheet] = useState(false)
  const [playerVisible, setPlayerVisible] = useState(false)
  const [dockSide, setDockSide] = useState<'left' | 'right' | 'center' | null>(null)

  const routeEnabled = isScrollToTopRouteEnabled(
    pathname || (typeof window !== 'undefined' ? window.location.pathname : ''),
    hasSheet,
  )
  const isFullPageDetail = pathname.startsWith('/nuggets/') && !hasSheet

  const syncChrome = useCallback(() => {
    setHasSheet(isSheetOpen())
    setPlayerVisible(isMiniPlayerVisible())
    setDockSide(getMiniPlayerDockSide())
  }, [])

  useEffect(() => {
    syncChrome()

    function onPlayerEvent() {
      syncChrome()
    }

    window.addEventListener(YOUTUBE_FEED_PLAY_EVENT, onPlayerEvent)
    window.addEventListener('resize', syncChrome, { passive: true })

    const bodyObserver = new MutationObserver(syncChrome)
    bodyObserver.observe(document.body, { childList: true, subtree: false })
    const htmlObserver = new MutationObserver(syncChrome)
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-sheet-open'],
    })

    return () => {
      window.removeEventListener(YOUTUBE_FEED_PLAY_EVENT, onPlayerEvent)
      window.removeEventListener('resize', syncChrome)
      bodyObserver.disconnect()
      htmlObserver.disconnect()
    }
  }, [syncChrome])

  useEffect(() => {
    if (!hydrated) return

    const scrollRoot = getActiveScrollRoot()
    ensureScrollTopSentinel(scrollRoot)

    function readScrollTop(): number {
      return scrollRoot ? scrollRoot.scrollTop : window.scrollY
    }

    function updateVisibility() {
      const activePath =
        pathname || (typeof window !== 'undefined' ? window.location.pathname : '')
      const enabled =
        isScrollToTopRouteEnabled(activePath, isSheetOpen()) &&
        !isSearchExpanded &&
        !isBlockingOverlayOpen()

      if (!enabled) {
        setShowButton(false)
        return
      }

      setShowButton(readScrollTop() >= SCROLL_SHOW_THRESHOLD_PX)
    }

    const scrollTarget: HTMLElement | Window = scrollRoot ?? window
    scrollTarget.addEventListener('scroll', updateVisibility, { passive: true })
    window.addEventListener('resize', updateVisibility, { passive: true })
    updateVisibility()

    return () => {
      scrollTarget.removeEventListener('scroll', updateVisibility)
      window.removeEventListener('resize', updateVisibility)
    }
  }, [hydrated, pathname, isSearchExpanded, hasSheet])

  if (!hydrated || !routeEnabled || isSearchExpanded || isBlockingOverlayOpen() || !showButton) {
    return null
  }

  const scrollRoot = getActiveScrollRoot()
  const useLeftOnDesktop = dockSide === 'right'

  return (
    <button
      type="button"
      onClick={() => scrollToTop(scrollRoot)}
      aria-label="Back to top"
      className={clsx(
        'fixed z-[90] flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/95 text-primary shadow-panel backdrop-blur transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60',
        isFullPageDetail && 'xl:hidden',
        'max-lg:left-4 max-lg:right-auto',
        useLeftOnDesktop ? 'lg:left-4 lg:right-auto' : 'lg:right-4 lg:left-auto',
        playerVisible
          ? 'max-lg:bottom-[calc(13rem+env(safe-area-inset-bottom))] lg:bottom-[calc(11rem+env(safe-area-inset-bottom))]'
          : 'max-lg:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-[max(1rem,env(safe-area-inset-bottom))]',
      )}
    >
      <ChevronUpIcon />
    </button>
  )
}
