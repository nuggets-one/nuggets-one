'use client'

import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { fabPositionClassName } from '@/lib/ui/floating-fab-layout'
import { isMiniPlayerVisible, getMiniPlayerDockSide } from '@/lib/ui/scroll-to-top'
import {
  getYouTubeHeroScrollRoot,
  NUGGET_YOUTUBE_HERO_ID,
  scrollYouTubeHeroIntoView,
} from '@/lib/ui/youtube-hero-scroll'
import {
  YOUTUBE_FEED_CLOSE_EVENT,
  YOUTUBE_FEED_PLAY_EVENT,
  type YouTubeFeedCloseDetail,
  type YouTubeFeedPlayDetail,
} from '@/lib/ui/youtube-feed-play'

type Props = {
  articleId: string
}

export function YouTubeJumpToHero({ articleId }: Props) {
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null)
  const [heroOffScreen, setHeroOffScreen] = useState(false)
  const [playerVisible, setPlayerVisible] = useState(false)
  const [dockSide, setDockSide] = useState<'left' | 'right' | 'center' | null>(null)

  useEffect(() => {
    function syncPlayer() {
      setPlayerVisible(isMiniPlayerVisible())
      setDockSide(getMiniPlayerDockSide())
    }

    function onPlay(e: Event) {
      const d = (e as CustomEvent<YouTubeFeedPlayDetail>).detail
      if (!d?.articleId || d.articleId !== articleId) return
      if (d.startSeconds > 0) {
        setActiveArticleId(articleId)
      }
      syncPlayer()
    }

    function onClose(e: Event) {
      const d = (e as CustomEvent<YouTubeFeedCloseDetail>).detail
      if (d?.articleId && d.articleId !== articleId) return
      setActiveArticleId(null)
      setHeroOffScreen(false)
      syncPlayer()
    }

    syncPlayer()
    window.addEventListener(YOUTUBE_FEED_PLAY_EVENT, onPlay)
    window.addEventListener(YOUTUBE_FEED_CLOSE_EVENT, onClose)
    window.addEventListener('resize', syncPlayer, { passive: true })

    const observer = new MutationObserver(syncPlayer)
    observer.observe(document.body, { childList: true, subtree: false })

    return () => {
      window.removeEventListener(YOUTUBE_FEED_PLAY_EVENT, onPlay)
      window.removeEventListener(YOUTUBE_FEED_CLOSE_EVENT, onClose)
      window.removeEventListener('resize', syncPlayer)
      observer.disconnect()
    }
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

  const showJump =
    activeArticleId === articleId && heroOffScreen && playerVisible
  if (!showJump) return null

  return (
    <button
      type="button"
      data-youtube-jump-fab
      onClick={() => scrollYouTubeHeroIntoView()}
      aria-label="Jump to video"
      className={clsx(fabPositionClassName({ dockSide, playerVisible: true }))}
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
