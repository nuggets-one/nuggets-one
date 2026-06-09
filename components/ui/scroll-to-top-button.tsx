'use client'

import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useMobileSearchExpanded } from '@/components/layout/mobile-search-context'
import { fabPositionClassName } from '@/lib/ui/floating-fab-layout'
import {
  YOUTUBE_FEED_CLOSE_EVENT,
  YOUTUBE_FEED_PLAY_EVENT,
} from '@/lib/ui/youtube-feed-play'
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
const JUMP_FAB_SELECTOR = '[data-youtube-jump-fab]'

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

function isJumpFabVisible(): boolean {
  if (typeof document === 'undefined') return false
  return document.querySelector(JUMP_FAB_SELECTOR) instanceof HTMLElement
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

      if (!enabled || isJumpFabVisible()) {
        setShowButton(false)
        return
      }

      setShowButton(readScrollTop() >= SCROLL_SHOW_THRESHOLD_PX)
    }

    syncChrome()

    function onPlayerChromeEvent() {
      syncChrome()
      updateVisibility()
    }

    window.addEventListener(YOUTUBE_FEED_PLAY_EVENT, onPlayerChromeEvent)
    window.addEventListener(YOUTUBE_FEED_CLOSE_EVENT, onPlayerChromeEvent)
    window.addEventListener('resize', updateVisibility, { passive: true })

    const scrollTarget: HTMLElement | Window = scrollRoot ?? window
    scrollTarget.addEventListener('scroll', updateVisibility, { passive: true })

    const bodyObserver = new MutationObserver(updateVisibility)
    bodyObserver.observe(document.body, { childList: true, subtree: true })

    const htmlObserver = new MutationObserver(onPlayerChromeEvent)
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-sheet-open'],
    })

    updateVisibility()

    return () => {
      window.removeEventListener(YOUTUBE_FEED_PLAY_EVENT, onPlayerChromeEvent)
      window.removeEventListener(YOUTUBE_FEED_CLOSE_EVENT, onPlayerChromeEvent)
      window.removeEventListener('resize', updateVisibility)
      scrollTarget.removeEventListener('scroll', updateVisibility)
      bodyObserver.disconnect()
      htmlObserver.disconnect()
    }
  }, [hydrated, pathname, isSearchExpanded, hasSheet, syncChrome])

  if (
    !hydrated ||
    !routeEnabled ||
    isSearchExpanded ||
    isBlockingOverlayOpen() ||
    !showButton ||
    isJumpFabVisible()
  ) {
    return null
  }

  const scrollRoot = getActiveScrollRoot()

  return (
    <button
      type="button"
      data-scroll-to-top-fab
      onClick={() => scrollToTop(scrollRoot)}
      aria-label="Back to top"
      className={clsx(
        fabPositionClassName({ dockSide, playerVisible }),
        isFullPageDetail && 'xl:hidden',
      )}
    >
      <ChevronUpIcon />
    </button>
  )
}
