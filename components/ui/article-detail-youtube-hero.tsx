'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { CardMediaRaster } from '@/components/ui/card-media-raster'
import { dispatchYouTubeFeedPlay } from '@/lib/ui/youtube-feed-play'
import {
  YOUTUBE_INLINE_PLAY_EVENT,
  type YouTubeInlinePlayDetail,
} from '@/lib/ui/youtube-inline-play'
import { trackYouTubePlay } from '@/lib/telemetry/youtube-play'
import { CardSourceBadge } from '@/components/ui/card-source-badge'
import {
  buildYouTubeNoCookieEmbedSrc,
  postYouTubeIframeCommand,
} from '@/lib/ui/youtube-embed'
import {
  canRenderWithNextImage,
  resolveCardImageUrl,
  safeHostname,
  shouldOptimizeImage,
} from '@/lib/ui/card-image-host'
import { cardMediaCoverImageClasses } from '@/lib/ui/card-media-hover'

function YouTubeBrandMark() {
  return (
    <div className="shrink-0" aria-hidden>
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
          fill="#FF0000"
        />
      </svg>
    </div>
  )
}

function CloseInlinePlayerIcon() {
  return (
    <svg
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

type Props = {
  videoId: string
  title: string
  heroThumbUrl: string | null
  heroAltText: string | null
  articleId: string
  sourceUrl: string | null
  sourceHost: string | null
  /** Hero image `sizes` for next/image */
  imageSizes: string
  preferInlinePlayback?: boolean
}

type InlinePlaybackState = {
  mountStartSeconds: number
  pendingSeekSeconds: number
  gen: number
}

export function ArticleDetailYouTubeHero({
  videoId,
  title,
  heroThumbUrl,
  heroAltText,
  articleId,
  sourceUrl,
  sourceHost,
  imageSizes,
  preferInlinePlayback = false,
}: Props) {
  const resolvedHeroUrl = resolveCardImageUrl(heroThumbUrl)
  const canShow = canRenderWithNextImage(resolvedHeroUrl)
  const useFetchRaster = Boolean(resolvedHeroUrl?.includes('/image/fetch/'))
  const [inlinePlayback, setInlinePlayback] = useState<InlinePlaybackState | null>(null)
  const inlineIframeRef = useRef<HTMLIFrameElement | null>(null)
  const pageOrigin = typeof window !== 'undefined' ? window.location.origin : null
  const inlinePlaybackActive = preferInlinePlayback && inlinePlayback !== null
  const iframeSrc = inlinePlaybackActive
    ? `${buildYouTubeNoCookieEmbedSrc(videoId, {
        autoplay: true,
        startSeconds: inlinePlayback.mountStartSeconds,
        pageOrigin,
      })}&playsinline=1`
    : null

  const seekInlinePlayer = useCallback((seconds: number) => {
    const win = inlineIframeRef.current?.contentWindow
    if (!win) return
    postYouTubeIframeCommand(win, 'seekTo', [seconds, true])
    postYouTubeIframeCommand(win, 'playVideo', [])
  }, [])

  useEffect(() => {
    if (!preferInlinePlayback) return

    function onInlinePlay(e: Event) {
      const detail = (e as CustomEvent<YouTubeInlinePlayDetail>).detail
      if (!detail?.articleId || detail.articleId !== articleId) return
      if (detail.videoId !== videoId) return
      const seconds = Math.max(0, Math.floor(detail.startSeconds))
      setInlinePlayback((prev) => {
        if (!prev) {
          return {
            mountStartSeconds: seconds,
            pendingSeekSeconds: seconds,
            gen: 1,
          }
        }
        return { ...prev, pendingSeekSeconds: seconds }
      })
    }

    window.addEventListener(YOUTUBE_INLINE_PLAY_EVENT, onInlinePlay)
    return () => window.removeEventListener(YOUTUBE_INLINE_PLAY_EVENT, onInlinePlay)
  }, [articleId, preferInlinePlayback, videoId])

  useEffect(() => {
    if (!inlinePlaybackActive || !inlinePlayback) return
    const timeoutId = window.setTimeout(() => {
      seekInlinePlayer(inlinePlayback.pendingSeekSeconds)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [inlinePlaybackActive, inlinePlayback, seekInlinePlayer])

  return (
    <div className="w-full">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-900">
        {sourceUrl ? (
          <CardSourceBadge href={sourceUrl} label={sourceHost} />
        ) : null}
        {inlinePlaybackActive && iframeSrc ? (
          <>
            <iframe
              key={`${articleId}-${videoId}-${inlinePlayback.gen}`}
              ref={inlineIframeRef}
              src={iframeSrc}
              title={title}
              className="absolute inset-0 z-[1] h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => {
                if (!inlinePlayback) return
                seekInlinePlayer(inlinePlayback.pendingSeekSeconds)
              }}
            />
            <button
              type="button"
              onClick={() => setInlinePlayback(null)}
              aria-label="Close inline player"
              className="absolute left-2 top-2 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <CloseInlinePlayerIcon />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (preferInlinePlayback) {
                setInlinePlayback({
                  mountStartSeconds: 0,
                  pendingSeekSeconds: 0,
                  gen: (inlinePlayback?.gen ?? 0) + 1,
                })
              } else {
                dispatchYouTubeFeedPlay({
                  videoId,
                  title,
                  startSeconds: 0,
                  articleId,
                })
              }
              trackYouTubePlay({
                video_id: videoId,
                seconds: 0,
                source: 'poster',
                playback_mode: preferInlinePlayback ? 'inline_hero' : 'mini_player',
                article_id: articleId,
              })
            }}
            className="group relative block h-full w-full min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            aria-label={`Play YouTube video: ${title}`}
          >
            {canShow && resolvedHeroUrl ? (
              useFetchRaster ? (
                <CardMediaRaster
                  src={resolvedHeroUrl}
                  alt={heroAltText ?? title}
                  priority
                  imageHover
                  fit="cover"
                />
              ) : (
                <Image
                  src={resolvedHeroUrl}
                  alt={heroAltText ?? title}
                  fill
                  className={`${cardMediaCoverImageClasses(false)} transition-opacity group-hover:opacity-95`}
                  sizes={imageSizes}
                  quality={80}
                  priority
                  unoptimized={!shouldOptimizeImage(safeHostname(resolvedHeroUrl))}
                />
              )
            ) : (
              <span className="absolute inset-0 bg-slate-900" aria-hidden />
            )}

            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] bg-gradient-to-t from-black/70 to-transparent px-3 py-2"
              aria-hidden
            >
              <div className="flex items-center gap-1.5">
                <YouTubeBrandMark />
                <p className="min-w-0 flex-1 truncate text-xs font-medium text-white/95">{title}</p>
              </div>
            </div>

            <span
              className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"
              aria-hidden
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-media-control text-inverse shadow-panel ring-2 ring-media-control-ring">
                <svg
                  className="ml-1 h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
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
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
      >
        Watch on YouTube ↗
      </a>
    </div>
  )
}
