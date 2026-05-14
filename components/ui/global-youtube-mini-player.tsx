'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildYouTubeNoCookieEmbedSrc } from '@/lib/ui/youtube-embed'
import {
  YOUTUBE_FEED_PLAY_EVENT,
  type YouTubeFeedPlayDetail,
} from '@/lib/ui/youtube-feed-play'

type PanelState = {
  videoId: string
  title: string
  startSeconds: number
  /** Bump to remount iframe when seeking the same video from feed. */
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

  useEffect(() => {
    function onPlay(e: Event) {
      const ce = e as CustomEvent<YouTubeFeedPlayDetail>
      const d = ce.detail
      if (!d?.videoId) return
      setPanel((prev) => ({
        videoId: d.videoId,
        title: d.title,
        startSeconds: d.startSeconds,
        gen: (prev?.gen ?? 0) + 1,
      }))
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
      className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:inset-x-auto lg:bottom-4 lg:right-4 lg:left-auto lg:px-0"
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-2xl border border-border bg-black shadow-panel ring-1 ring-elevated lg:rounded-2xl">
        <div className="relative aspect-video w-full overflow-hidden">
          <iframe
            key={panel.gen}
            src={iframeSrc}
            title={panel.title}
            className="absolute inset-0 h-full w-full"
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
