'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ArticleCard } from '@/components/ui/article-card'
import { ArticleCardSkeleton } from '@/components/ui/article-card-skeleton'
import { BookmarkBatchHydrator } from '@/components/ui/bookmark-batch-hydrator'
import { StatusBlock } from '@/components/ui/status-block'
import type { ArticleCardProps, FeedCursor, ContentStream } from '@/types/article'
import { readResponseJson } from '@/lib/http/parse-json-response'

type Props = {
  initialCursor: FeedCursor | null
  stream: ContentStream
  tags: string[]
  q: string
  isAuthenticated: boolean
  isAdmin: boolean
}

type FeedApiResponse = {
  articles: ArticleCardProps[]
  nextCursor: FeedCursor | null
}

export function FeedPager({ initialCursor, stream, tags, q, isAuthenticated, isAdmin }: Props) {
  const [cards, setCards] = useState<ArticleCardProps[]>([])
  const [cursor, setCursor] = useState<FeedCursor | null>(initialCursor)
  const [isLoading, setIsLoading] = useState(false)
  const [isEnd, setIsEnd] = useState(initialCursor === null)
  const [error, setError] = useState<string | null>(null)
  const isFetchingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  // S5-F1: abort in-flight requests when filter/stream changes cause remount
  const abortRef = useRef<AbortController | null>(null)

  const fetchNextPage = useCallback(async () => {
    if (isFetchingRef.current || isEnd || !cursor) return
    isFetchingRef.current = true
    setIsLoading(true)
    setError(null)

    abortRef.current = new AbortController()

    try {
      const params = new URLSearchParams({ stream })
      if (tags.length) params.set('tags', tags.join(','))
      if (q) params.set('q', q)
      if (cursor) {
        params.set('cursor_pub', cursor.published_at)
        params.set('cursor_id', cursor.id)
        if (typeof cursor.rank === 'number') {
          params.set('cursor_rank', String(cursor.rank))
        }
      }

      const res = await fetch(`/api/feed?${params.toString()}`, {
        signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`)

      const data = await readResponseJson<FeedApiResponse>(res)
      if (!data?.articles) {
        throw new Error('Feed response was not valid JSON')
      }

      setCards((prev) => [...prev, ...data.articles])
      setCursor(data.nextCursor)
      if (!data.nextCursor) setIsEnd(true)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [cursor, isEnd, stream, tags, q])

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage()
        }
      },
      { root: null, rootMargin: '800px 0px', threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchNextPage])

  return (
    <>
      {cards.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
          <BookmarkBatchHydrator articleIds={cards.slice(-24).map((article) => article.id)} />
          {cards.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              isAuthenticated={isAuthenticated}
              initialBookmarked={false}
              adminEditHref={
                isAdmin ? `/admin/articles/${article.id}` : null
              }
            />
          ))}
        </div>
      )}

      {isLoading && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <StatusBlock
          heading="Couldn't load more nuggets."
          body="Please try again. If this keeps happening, refresh the page."
        >
          <button
            onClick={fetchNextPage}
            className="mt-3 text-sm font-medium text-primary underline underline-offset-2"
          >
            Retry
          </button>
        </StatusBlock>
      )}

      {isEnd && !isLoading && cards.length > 0 && (
        <p className="mt-8 text-center text-sm text-muted">You&apos;re all caught up</p>
      )}

      {!isEnd && (
        <div
          ref={sentinelRef}
          className="mt-4 h-3 w-full touch-none select-none"
          aria-hidden="true"
        />
      )}
    </>
  )
}
