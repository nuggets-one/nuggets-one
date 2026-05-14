'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  buildYouTubeNoCookieEmbedSrc,
  postYouTubeIframeCommand,
} from '@/lib/ui/youtube-embed'
import {
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

export function GlobalYouTubeMiniPlayer() {
  const [panel, setPanel] = useState<PanelState | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

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

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-[100] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:justify-end lg:px-4"
      role="complementary"
      aria-label={dialogLabel}
    >
      {/*
        Keep inset-x-0 on all breakpoints so this fixed box always has a definite
        width (full viewport). Using left/right auto at lg (inset-x-auto) made the
        shrink-to-fit width resolve to ~0 with a w-full child — iframe played audio
        but had no visible horizontal size.
      */}
      <div className="relative w-full min-w-0 max-w-lg overflow-hidden rounded-t-2xl border border-border bg-black shadow-panel ring-1 ring-elevated lg:rounded-2xl">
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
            className="absolute right-2 top-2 z-[70] flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <CloseCrossIcon />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
