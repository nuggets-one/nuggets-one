'use client'

// TimestampLinkInterceptor — Phase 6 / plan §6.3a.
// Wraps an article body and uses event delegation to convert anchor clicks
// like `[label](#yt=120)` into a `youtube-seek` window event consumed by
// `<YouTubePlayer/>`. ArticleBody stays a Server Component (react-markdown
// renders to static HTML); this thin client wrapper only adds one click
// listener per detail page.

import { type MouseEvent, type ReactNode } from 'react'
import { resolveDetailYouTubeTimestampClick } from '@/lib/ui/youtube-inline-url'
import { YOUTUBE_SEEK_EVENT, type YouTubeSeekDetail } from './youtube-player'

type Props = {
  children: ReactNode
  /** Hero YouTube id — full watch URLs are intercepted only when `v` matches. */
  heroVideoId: string
}

export function TimestampLinkInterceptor({ children, heroVideoId }: Props) {
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
    const detail: YouTubeSeekDetail = { seconds }
    window.dispatchEvent(new CustomEvent(YOUTUBE_SEEK_EVENT, { detail }))
  }

  return <div onClickCapture={handleClickCapture}>{children}</div>
}
