'use client'

import { useEffect } from 'react'
import { readResponseJson } from '@/lib/http/parse-json-response'

type Props = {
  articleIds: string[]
}

export const BOOKMARK_HYDRATED_EVENT = 'nuggets:bookmark-hydrated'

export type BookmarkHydratedDetail = {
  articleIds: string[]
  bookmarkedIds: string[]
}

export function BookmarkBatchHydrator({ articleIds }: Props) {
  const ids = articleIds.slice(0, 24).join(',')

  useEffect(() => {
    if (!ids) return

    let cancelled = false
    const requestArticleIds = ids.split(',').filter(Boolean)

    fetch(`/api/bookmarks/check?ids=${encodeURIComponent(ids)}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) return { bookmarkedArticleIds: [] as string[] }
        const data = await readResponseJson<{ bookmarkedArticleIds?: string[] }>(res)
        return { bookmarkedArticleIds: data?.bookmarkedArticleIds ?? [] }
      })
      .then((data: { bookmarkedArticleIds?: string[] }) => {
        if (cancelled) return
        window.dispatchEvent(
          new CustomEvent<BookmarkHydratedDetail>(BOOKMARK_HYDRATED_EVENT, {
            detail: {
              articleIds: requestArticleIds,
              bookmarkedIds: data.bookmarkedArticleIds ?? [],
            },
          })
        )
      })
      .catch(() => {
        // Bookmark hydration is progressive enhancement; leave buttons unsaved on failure.
      })

    return () => {
      cancelled = true
    }
  }, [ids])

  return null
}
