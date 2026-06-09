'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  buildYouTubeNoCookieEmbedSrc,
  postYouTubeIframeCommand,
} from '@/lib/ui/youtube-embed'
import {
  dispatchYouTubeFeedClose,
  YOUTUBE_FEED_PLAY_EVENT,
  type YouTubeFeedPlayDetail,
} from '@/lib/ui/youtube-feed-play'

type PanelState = {
  videoId: string
  title: string
  startSeconds: number
  /** Bump to remount iframe when opening a different video or first open. */
  gen: number
}

type DockSide = 'left' | 'right' | 'center'

function CloseCrossIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function isVisibleElement(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el)
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0' ||
    style.pointerEvents === 'none'
  ) {
    return false
  }
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function overlapArea(a: DOMRect, b: DOMRect): number {
  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)
  const right = Math.min(a.right, b.right)
  const bottom = Math.min(a.bottom, b.bottom)
  if (right <= left || bottom <= top) return 0
  return (right - left) * (bottom - top)
}

export function GlobalYouTubeMiniPlayer() {
  const [panel, setPanel] = useState<PanelState | null>(null)
  const [dockSide, setDockSide] = useState<DockSide>('center')
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const resolveDockSide = useCallback((): DockSide => {
    if (typeof window === 'undefined') return 'center'
    if (window.innerWidth < 1024) return 'center'

    const dialogs = Array.from(
      document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'),
    ).filter((el) => isVisibleElement(el))

    if (dialogs.length === 0) return 'right'

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const playerWidth = Math.min(512, Math.max(320, viewportWidth - 32))
    const playerHeight = Math.round((playerWidth * 9) / 16)

    const leftCandidate = {
      left: 16,
      right: 16 + playerWidth,
      top: viewportHeight - 16 - playerHeight,
      bottom: viewportHeight - 16,
    } as DOMRect
    const rightCandidate = {
      left: viewportWidth - 16 - playerWidth,
      right: viewportWidth - 16,
      top: viewportHeight - 16 - playerHeight,
      bottom: viewportHeight - 16,
    } as DOMRect

    let leftCollisionScore = 0
    let rightCollisionScore = 0

    for (const dialog of dialogs) {
      const rect = dialog.getBoundingClientRect()
      leftCollisionScore += overlapArea(leftCandidate, rect)
      rightCollisionScore += overlapArea(rightCandidate, rect)
    }

    return leftCollisionScore <= rightCollisionScore ? 'left' : 'right'
  }, [])

  useEffect(() => {
    function onPlay(e: Event) {
      const ce = e as CustomEvent<YouTubeFeedPlayDetail>
      const d = ce.detail
      if (!d?.videoId) return
      const vid = d.videoId.trim()
      const secs = Math.max(0, Math.floor(Number(d.startSeconds ?? 0)))

      setPanel((prev) => {
        if (prev?.videoId === vid) {
          window.setTimeout(() => {
            const win = iframeRef.current?.contentWindow
            if (!win) return
            postYouTubeIframeCommand(win, 'seekTo', [secs, true])
            postYouTubeIframeCommand(win, 'playVideo', [])
          }, 0)
          return prev.title === d.title ? prev : { ...prev, title: d.title }
        }
        return {
          videoId: vid,
          title: d.title,
          startSeconds: secs,
          gen: (prev?.gen ?? 0) + 1,
        }
      })
    }
    window.addEventListener(YOUTUBE_FEED_PLAY_EVENT, onPlay)
    return () => window.removeEventListener(YOUTUBE_FEED_PLAY_EVENT, onPlay)
  }, [])

  const close = useCallback(() => {
    dispatchYouTubeFeedClose()
    setPanel(null)
  }, [])

  useEffect(() => {
    if (!panel) return
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [panel, close])

  useEffect(() => {
    if (!panel) return

    let rafId = 0
    function recalculateDockSide() {
      cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(() => {
        setDockSide(resolveDockSide())
      })
    }

    recalculateDockSide()
    window.addEventListener('resize', recalculateDockSide)

    const observer = new MutationObserver(recalculateDockSide)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', recalculateDockSide)
      observer.disconnect()
    }
  }, [panel, resolveDockSide])

  if (typeof document === 'undefined' || !panel) return null

  const pageOrigin = typeof window !== 'undefined' ? window.location.origin : null
  const iframeSrc = buildYouTubeNoCookieEmbedSrc(panel.videoId, {
    autoplay: true,
    startSeconds: panel.startSeconds,
    pageOrigin,
  })

  const dialogLabel = panel.title.trim()
    ? `Playing video: ${panel.title}`
    : 'In-app YouTube player'

  const rootClassName =
    dockSide === 'center'
      ? 'fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-[100] w-[clamp(15rem,88vw,22rem)] -translate-x-1/2 pt-2 sm:w-[clamp(16rem,72vw,24rem)]'
      : dockSide === 'left'
        ? 'fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-4 z-[100] w-[min(32rem,calc(100vw-2rem))]'
        : 'fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-4 z-[100] w-[min(32rem,calc(100vw-2rem))]'

  return createPortal(
    <div
      ref={rootRef}
      data-youtube-mini-player
      data-dock-side={dockSide}
      className={rootClassName}
      role="complementary"
      aria-label={dialogLabel}
      aria-live="polite"
    >
      <div className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-black shadow-panel ring-1 ring-elevated">
        <div className="relative aspect-video w-full min-h-0 overflow-hidden">
          <iframe
            key={panel.gen}
            ref={iframeRef}
            src={iframeSrc}
            title={panel.title}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close player"
            className="absolute right-1.5 top-1.5 z-[70] flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow-md ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 lg:right-2 lg:top-2 lg:h-8 lg:w-8"
          >
            <CloseCrossIcon />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
