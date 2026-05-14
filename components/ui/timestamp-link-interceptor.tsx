'use client'

// TimestampLinkInterceptor — opens / seeks the deferred global YouTube mini-player
// for `#yt=` timestamp links on nuggets with a YouTube hero.

import { type MouseEvent, type ReactNode } from 'react'
import { resolveDetailYouTubeTimestampClick } from '@/lib/ui/youtube-inline-url'
import { dispatchYouTubeFeedPlay } from '@/lib/ui/youtube-feed-play'

type Props = {
  children: ReactNode
  /** Hero YouTube id — full watch URLs are intercepted only when `v` matches. */
  heroVideoId: string
  videoTitle: string
  articleId: string
}

export function TimestampLinkInterceptor({
  children,
  heroVideoId,
  videoTitle,
  articleId,
}: Props) {
  function handleClickCapture(e: MouseEvent<HTMLDivElement>) {
    const target = e.target
    if (!(target instanceof Element)) return
    const anchor = target.closest('a')
    if (!anchor) return

    const href = anchor.getAttribute('href')
    const seconds = resolveDetailYouTubeTimestampClick(href, heroVideoId.trim())
    if (seconds === null) return

    e.preventDefault()
    e.stopPropagation()
    dispatchYouTubeFeedPlay({
      videoId: heroVideoId.trim(),
      title: videoTitle,
      startSeconds: seconds,
      articleId,
    })
  }

  return <div onClickCapture={handleClickCapture}>{children}</div>
}
