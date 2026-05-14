'use client'

import { type MouseEvent, type ReactNode } from 'react'
import { dispatchYouTubeFeedPlay } from '@/lib/ui/youtube-feed-play'
import { resolveCardPreviewYouTubeClick } from '@/lib/ui/youtube-inline-url'

type Props = {
  videoId: string
  title: string
  articleId: string
  children: ReactNode
}

/**
 * Card preview: `#yt=` links and YouTube watch URLs open the feed mini-player
 * instead of navigating away.
 */
export function CardPreviewYouTubeTimestamps({
  videoId,
  title,
  articleId,
  children,
}: Props) {
  function handleClickCapture(e: MouseEvent<HTMLDivElement>) {
    const target = e.target
    if (!(target instanceof Element)) return
    const anchor = target.closest('a')
    if (!anchor) return

    const href = anchor.getAttribute('href')
    const resolved = resolveCardPreviewYouTubeClick(href, videoId)
    if (!resolved) return

    e.preventDefault()
    e.stopPropagation()
    dispatchYouTubeFeedPlay({
      videoId: resolved.videoId,
      title,
      startSeconds: resolved.startSeconds,
      articleId,
    })
  }

  return <div onClickCapture={handleClickCapture}>{children}</div>
}
