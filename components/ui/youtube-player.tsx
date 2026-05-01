'use client'

// YouTubePlayer — facade pattern + lazy iframe.
// Plan §6.3a / Phase 6: poster ↔ embed state machine; iframe is not in the
// DOM until first user gesture, so the LCP element is the poster image.
//
// Body timestamp links dispatch `youtube-seek` events on `window`; this
// component listens and either mounts the iframe with `start=N` (cold) or
// posts a `seekTo` command to the existing iframe (warm). Outbound link
// is always rendered so users can leave to youtube.com regardless of state.

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

const EMBED_ORIGIN = 'https://www.youtube-nocookie.com'

export const YOUTUBE_SEEK_EVENT = 'youtube-seek'

export type YouTubeSeekDetail = {
  seconds: number
}

type Props = {
  videoId: string
  posterUrl: string | null
  title: string
}

function buildEmbedSrc(videoId: string, start: number | null, autoplay: boolean) {
  const params = new URLSearchParams({ enablejsapi: '1', rel: '0' })
  if (autoplay) params.set('autoplay', '1')
  if (start && start > 0) params.set('start', String(start))
  return `${EMBED_ORIGIN}/embed/${encodeURIComponent(videoId)}?${params.toString()}`
}

function logPlay(videoId: string, seconds: number, source: 'poster' | 'timestamp') {
  if (typeof window !== 'undefined') {
    console.log('[telemetry]', {
      event: 'youtube_play',
      video_id: videoId,
      seconds,
      source,
    })
  }
}

export function YouTubePlayer({ videoId, posterUrl, title }: Props) {
  const [mounted, setMounted] = useState(false)
  const [initialStart, setInitialStart] = useState<number | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handler(event: Event) {
      const detail = (event as CustomEvent<YouTubeSeekDetail>).detail
      const seconds = Math.max(0, Math.floor(Number(detail?.seconds ?? 0)))

      if (!mounted) {
        setInitialStart(seconds)
        setMounted(true)
      } else if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [seconds, true],
          }),
          EMBED_ORIGIN,
        )
      }

      logPlay(videoId, seconds, 'timestamp')
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    window.addEventListener(YOUTUBE_SEEK_EVENT, handler)
    return () => window.removeEventListener(YOUTUBE_SEEK_EVENT, handler)
  }, [mounted, videoId])

  function handlePosterClick() {
    setInitialStart(null)
    setMounted(true)
    logPlay(videoId, 0, 'poster')
  }

  return (
    <div ref={containerRef} className="my-8">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-surface-raised">
        {mounted ? (
          <iframe
            ref={iframeRef}
            src={buildEmbedSrc(videoId, initialStart, true)}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            onClick={handlePosterClick}
            aria-label={`Play ${title} (YouTube)`}
            className="group absolute inset-0 block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
          >
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={`${title} thumbnail`}
                fill
                className="object-cover"
                sizes="(max-width: 672px) 100vw, 672px"
                quality={80}
                priority
              />
            ) : (
              <span
                className="absolute inset-0 bg-surface-raised"
                aria-hidden="true"
              />
            )}
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30"
              aria-hidden="true"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/65 text-white shadow-lg ring-2 ring-white/80">
                <svg
                  className="ml-1 h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </button>
        )}
      </div>
      <a
        href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Watch ${title} on YouTube (opens in new tab)`}
        className="mt-2 inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
      >
        Watch on YouTube ↗
      </a>
    </div>
  )
}
