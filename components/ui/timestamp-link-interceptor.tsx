'use client'

// TimestampLinkInterceptor — Phase 6 / plan §6.3a.
// Wraps an article body and uses event delegation to convert anchor clicks
// like `[label](#yt=120)` into a `youtube-seek` window event consumed by
// `<YouTubePlayer/>`. ArticleBody stays a Server Component (react-markdown
// renders to static HTML); this thin client wrapper only adds one click
// listener per detail page.

import { type MouseEvent, type ReactNode } from 'react'
import { YOUTUBE_SEEK_EVENT, type YouTubeSeekDetail } from './youtube-player'

const HASH_PREFIX = '#yt='

function parseSeconds(href: string | null): number | null {
  if (!href || !href.startsWith(HASH_PREFIX)) return null
  const raw = href.slice(HASH_PREFIX.length)
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0 || String(n) !== raw) return null
  return n
}

type Props = {
  children: ReactNode
}

export function TimestampLinkInterceptor({ children }: Props) {
  function handleClick(e: MouseEvent<HTMLDivElement>) {
    const target = e.target
    if (!(target instanceof Element)) return
    const anchor = target.closest('a')
    if (!anchor) return

    const seconds = parseSeconds(anchor.getAttribute('href'))
    if (seconds === null) return

    e.preventDefault()
    const detail: YouTubeSeekDetail = { seconds }
    window.dispatchEvent(new CustomEvent(YOUTUBE_SEEK_EVENT, { detail }))
  }

  return <div onClick={handleClick}>{children}</div>
}
