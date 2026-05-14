'use client'

import Image from 'next/image'
import { CardMediaRaster } from '@/components/ui/card-media-raster'
import { dispatchYouTubeFeedPlay } from '@/lib/ui/youtube-feed-play'
import {
  canRenderWithNextImage,
  resolveCardImageUrl,
  safeHostname,
  shouldOptimizeImage,
} from '@/lib/ui/card-image-host'
import {
  cardMediaGroupClasses,
  cardMediaImageHoverClasses,
} from '@/lib/ui/card-media-hover'

function NoPreviewPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg text-xs font-medium text-muted">
      No preview
    </div>
  )
}

function SourceExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  )
}

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

type Props = {
  title: string
  hero_thumb_url: string | null
  hero_alt_text: string | null
  priority: boolean
  videoId: string
  articleId: string
  sourceUrl: string | null
  sourceHost: string | null
}

export function YouTubeFeedHero({
  title,
  hero_thumb_url,
  hero_alt_text,
  priority,
  videoId,
  articleId,
  sourceUrl,
  sourceHost,
}: Props) {
  const resolvedHeroUrl = resolveCardImageUrl(hero_thumb_url)
  const canShow = canRenderWithNextImage(resolvedHeroUrl)
  const useFetchRaster = Boolean(resolvedHeroUrl?.includes('/image/fetch/'))

  return (
    <div className="w-full rounded-t-xl px-2 pb-2 pt-2">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-bg">
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={
              sourceHost ? `Open source on ${sourceHost} (opens in new tab)` : 'Open source in new tab'
            }
            className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-sm transition-all hover:scale-105 hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/70"
          >
            <SourceExternalLinkIcon />
            <span>Source</span>
          </a>
        ) : null}
        <button
          type="button"
          onClick={() =>
            dispatchYouTubeFeedPlay({
              videoId,
              title,
              startSeconds: 0,
              articleId,
            })
          }
          className={`relative block h-full w-full min-h-0 ${cardMediaGroupClasses} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface`}
          aria-label={`Play YouTube video: ${title}`}
        >
          {canShow && resolvedHeroUrl ? (
            useFetchRaster ? (
              <CardMediaRaster
                src={resolvedHeroUrl}
                alt={hero_alt_text ?? title}
                priority={priority}
                imageHover
              />
            ) : (
              <Image
                src={resolvedHeroUrl}
                alt={hero_alt_text ?? title}
                fill
                className={`object-cover ${cardMediaImageHoverClasses}`}
                sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) calc((100vw - 3rem) / 2), (max-width: 1536px) calc((100vw - 4rem) / 4), 320px"
                quality={75}
                priority={priority}
                unoptimized={!shouldOptimizeImage(safeHostname(resolvedHeroUrl))}
              />
            )
          ) : (
            <NoPreviewPlaceholder />
          )}

          {/*
            Strong bottom scrim: some YouTube posters include channel/wordmark art
            in this band; a light gradient reads as a "gap" between the SVG and title.
          */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] rounded-b-lg bg-gradient-to-t from-black/95 via-black/80 to-transparent px-2 py-1.5 backdrop-blur-[2px]"
            aria-hidden
          >
            <div className="flex items-center gap-1.5">
              <YouTubeBrandMark />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-medium text-white/90">{title}</p>
              </div>
            </div>
          </div>

          <span
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"
            aria-hidden
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-1 ring-white/30 backdrop-blur-[2px] sm:h-11 sm:w-11">
              <svg
                className="ml-0.5 h-4 w-4 sm:h-[18px] sm:w-[18px]"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}
