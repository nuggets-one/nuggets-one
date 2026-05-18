'use client'

// TimestampLinkInterceptor — opens / seeks the deferred global YouTube mini-player
// for `#yt=` timestamp links on nuggets with a YouTube hero.

import { type MouseEvent, type ReactNode } from 'react'
import { scrollYouTubeHeroIntoView } from '@/lib/ui/youtube-hero-scroll'
import {
  parseYouTubeInlineNavigation,
  resolveDetailYouTubeTimestampClick,
} from '@/lib/ui/youtube-inline-url'
import { dispatchYouTubeFeedPlay } from '@/lib/ui/youtube-feed-play'
import { trackYouTubePlay } from '@/lib/telemetry/youtube-play'

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
    const trimmedHeroId = heroVideoId.trim()
    const seconds = resolveDetailYouTubeTimestampClick(href, trimmedHeroId)

    if (seconds === null) {
      const nav = parseYouTubeInlineNavigation(href)
      if (!nav) return
      e.preventDefault()
      e.stopPropagation()
      window.open(href ?? '', '_blank', 'noopener,noreferrer')
      return
    }

    e.preventDefault()
    e.stopPropagation()
    dispatchYouTubeFeedPlay({
      videoId: trimmedHeroId,
      title: videoTitle,
      startSeconds: seconds,
      articleId,
    })
    trackYouTubePlay({
      video_id: trimmedHeroId,
      seconds,
      source: 'timestamp',
      article_id: articleId,
    })
    scrollYouTubeHeroIntoView()
  }

  return <div onClickCapture={handleClickCapture}>{children}</div>
}
