'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ArticleCard } from '@/components/ui/article-card'
import { ArticleCardSkeleton } from '@/components/ui/article-card-skeleton'
import type { ArticleCardProps, FeedCursor, ContentStream } from '@/types/article'

type Props = {
  initialCursor: FeedCursor | null
  stream: ContentStream
  tags: string[]
  q: string
  isAuthenticated?: boolean
}

export function FeedPager({ initialCursor, stream, tags, q, isAuthenticated = false }: Props) {
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
      }

      const res = await fetch(`/api/feed?${params.toString()}`, {
        signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`)

      const data = await res.json()

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
        if (entries[0].isIntersecting) {
          fetchNextPage()
        }
      },
      { rootMargin: '400px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchNextPage])

  return (
    <>
      {cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mt-4">
          {cards.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="mt-6 text-center">
          <p className="text-sm text-muted mb-2">Couldn&apos;t load more nuggets.</p>
          <button
            onClick={fetchNextPage}
            className="text-sm font-medium text-primary underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {isEnd && !isLoading && cards.length > 0 && (
        <p className="mt-8 text-center text-sm text-muted">You&apos;re all caught up</p>
      )}

      {!isEnd && <div ref={sentinelRef} className="h-px" aria-hidden="true" />}
    </>
  )
}
