'use client'

import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useMobileSearchExpanded } from '@/components/layout/mobile-search-context'
import { fabPositionClassName } from '@/lib/ui/floating-fab-layout'
import {
  YOUTUBE_FEED_CLOSE_EVENT,
  YOUTUBE_FEED_PLAY_EVENT,
  YOUTUBE_JUMP_FAB_VISIBILITY_EVENT,
  type YouTubeJumpFabVisibilityDetail,
} from '@/lib/ui/youtube-feed-play'
import {
  getActiveScrollRoot,
  getMiniPlayerDockSide,
  isBlockingOverlayOpen,
  isMiniPlayerVisible,
  isScrollToTopRouteEnabled,
  isSheetOpen,
  readActiveScrollTop,
  scrollToTop,
  subscribeActiveScrollRoot,
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
  const [sheetOpen, setSheetOpen] = useState(false)
  const [playerVisible, setPlayerVisible] = useState(false)
  const [dockSide, setDockSide] = useState<'left' | 'right' | 'center' | null>(null)
  const [jumpFabActive, setJumpFabActive] = useState(false)

  const activePath =
    pathname || (typeof window !== 'undefined' ? window.location.pathname : '')
  const routeEnabled = isScrollToTopRouteEnabled(activePath, sheetOpen)
  const isFullPageDetail = pathname.startsWith('/nuggets/') && !sheetOpen

  const syncChrome = useCallback(() => {
    setSheetOpen(isSheetOpen())
    setPlayerVisible(isMiniPlayerVisible())
    setDockSide(getMiniPlayerDockSide())
  }, [])

  const updateVisibility = useCallback(() => {
    const enabled =
      isScrollToTopRouteEnabled(activePath, isSheetOpen()) &&
      !isSearchExpanded &&
      !isBlockingOverlayOpen()

    if (!enabled || jumpFabActive) {
      setShowButton(false)
      return
    }

    setShowButton(readActiveScrollTop() >= SCROLL_SHOW_THRESHOLD_PX)
  }, [activePath, isSearchExpanded, jumpFabActive])

  useEffect(() => {
    if (!hydrated) return

    syncChrome()

    function onPlayerChromeEvent() {
      syncChrome()
      updateVisibility()
    }

    function onJumpFabVisibility(e: Event) {
      const d = (e as CustomEvent<YouTubeJumpFabVisibilityDetail>).detail
      setJumpFabActive(Boolean(d?.visible))
    }

    window.addEventListener(YOUTUBE_FEED_PLAY_EVENT, onPlayerChromeEvent)
    window.addEventListener(YOUTUBE_FEED_CLOSE_EVENT, onPlayerChromeEvent)
    window.addEventListener(YOUTUBE_JUMP_FAB_VISIBILITY_EVENT, onJumpFabVisibility)
    window.addEventListener('resize', updateVisibility, { passive: true })

    const unsubscribeScroll = subscribeActiveScrollRoot(updateVisibility)

    const htmlObserver = new MutationObserver(onPlayerChromeEvent)
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-sheet-open'],
    })

    updateVisibility()

    return () => {
      window.removeEventListener(YOUTUBE_FEED_PLAY_EVENT, onPlayerChromeEvent)
      window.removeEventListener(YOUTUBE_FEED_CLOSE_EVENT, onPlayerChromeEvent)
      window.removeEventListener(YOUTUBE_JUMP_FAB_VISIBILITY_EVENT, onJumpFabVisibility)
      window.removeEventListener('resize', updateVisibility)
      unsubscribeScroll()
      htmlObserver.disconnect()
    }
  }, [hydrated, syncChrome, updateVisibility])

  useEffect(() => {
    if (!hydrated) return
    updateVisibility()
  }, [hydrated, jumpFabActive, updateVisibility])

  if (
    !hydrated ||
    !routeEnabled ||
    isSearchExpanded ||
    isBlockingOverlayOpen() ||
    !showButton ||
    jumpFabActive
  ) {
    return null
  }

  return (
    <button
      type="button"
      data-scroll-to-top-fab
      onClick={() => scrollToTop(getActiveScrollRoot())}
      aria-label="Back to top"
      className={clsx(
        fabPositionClassName({ dockSide, playerVisible, sheetOpen }),
        isFullPageDetail && 'xl:hidden',
      )}
    >
      <ChevronUpIcon />
    </button>
  )
}
