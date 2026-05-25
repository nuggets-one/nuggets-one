'use client'

import { useEffect, useState } from 'react'
import {
  getYouTubeHeroScrollRoot,
  NUGGET_YOUTUBE_HERO_ID,
  scrollYouTubeHeroIntoView,
} from '@/lib/ui/youtube-hero-scroll'
import {
  YOUTUBE_FEED_PLAY_EVENT,
  type YouTubeFeedPlayDetail,
} from '@/lib/ui/youtube-feed-play'

type Props = {
  articleId: string
}

export function YouTubeJumpToHero({ articleId }: Props) {
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null)
  const [heroOffScreen, setHeroOffScreen] = useState(false)

  useEffect(() => {
    function onPlay(e: Event) {
      const d = (e as CustomEvent<YouTubeFeedPlayDetail>).detail
      if (!d?.articleId || d.articleId !== articleId) return
      if (d.startSeconds > 0) {
        setActiveArticleId(articleId)
      }
    }
    window.addEventListener(YOUTUBE_FEED_PLAY_EVENT, onPlay)
    return () => window.removeEventListener(YOUTUBE_FEED_PLAY_EVENT, onPlay)
  }, [articleId])

  useEffect(() => {
    if (activeArticleId !== articleId) return

    const hero = document.getElementById(NUGGET_YOUTUBE_HERO_ID)
    if (!hero) return

    const root = getYouTubeHeroScrollRoot(hero)
    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeroOffScreen(entry ? entry.intersectionRatio < 0.2 : false)
      },
      {
        root,
        threshold: [0, 0.2, 1],
      },
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [activeArticleId, articleId])

  const showJump = activeArticleId === articleId && heroOffScreen
  if (!showJump) return null

  return (
    <button
      type="button"
      onClick={() => scrollYouTubeHeroIntoView()}
      aria-label="Jump to video"
      className="fixed right-4 z-[90] flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/95 text-primary shadow-panel backdrop-blur transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 max-lg:bottom-[calc(13rem+env(safe-area-inset-bottom))] lg:bottom-[calc(11rem+env(safe-area-inset-bottom))]"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  )
}
