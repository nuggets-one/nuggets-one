'use client'

// Logged-out: redirects to /login?next=<currentPath> — no auth modal (PRODUCT §0.7)

import { useEffect, useState, type MouseEvent } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toggleBookmarkAction } from '@/lib/actions/bookmarks'
import {
  BOOKMARK_HYDRATED_EVENT,
  type BookmarkHydratedDetail,
} from '@/components/ui/bookmark-batch-hydrator'

type Props = {
  articleId: string
  initialBookmarked: boolean
  isAuthenticated?: boolean
  variant?: 'card' | 'detail' | 'footer'
}

export function BookmarkButton({
  articleId,
  initialBookmarked,
  isAuthenticated,
  variant = 'card',
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    function handleHydrated(event: Event) {
      const detail = (event as CustomEvent<BookmarkHydratedDetail>).detail
      if (!detail?.bookmarkedIds || !detail.articleIds?.includes(articleId)) return
      setBookmarked(detail.bookmarkedIds.includes(articleId))
    }

    window.addEventListener(BOOKMARK_HYDRATED_EVENT, handleHydrated)
    return () => window.removeEventListener(BOOKMARK_HYDRATED_EVENT, handleHydrated)
  }, [articleId])

  async function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()

    if (isAuthenticated === false) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    if (isPending) return
    setIsPending(true)

    // Optimistic update
    setBookmarked((prev) => !prev)

    // S11-F10: auth check is server-side — no client getUser() call per click
    const result = await toggleBookmarkAction(articleId, bookmarked)

    if (result.error) {
      // Roll back optimistic update
      setBookmarked((prev) => !prev)
      if (result.error === 'not_authenticated') {
        router.push(`/login?next=${encodeURIComponent(pathname)}`)
      }
    }

    setIsPending(false)
  }

  const label = bookmarked ? 'Remove bookmark' : 'Bookmark this nugget'

  return (
    <button
      onClick={handleClick}
      aria-label={label}
      aria-pressed={bookmarked}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 transition-colors min-h-[44px] min-w-[44px] justify-center ${
        variant === 'detail'
          ? 'px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-surface-raised active:bg-surface-raised/80'
          : variant === 'footer'
            ? 'rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface dark:hover:bg-slate-800'
            : 'h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg border border-border bg-transparent hover:bg-surface-raised active:bg-surface-raised/80'
      } ${
        variant === 'footer'
          ? bookmarked
            ? 'text-[#ca8a04] dark:text-[#eab308]'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
          : bookmarked
            ? 'text-accent'
            : 'text-muted hover:text-primary'
      } ${
        isPending ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <svg
        className={variant === 'footer' ? 'h-4 w-4' : 'w-4 h-4'}
        fill={bookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={variant === 'footer' ? 1.5 : 2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z"
        />
      </svg>
      {variant === 'detail' && (
        <span>{bookmarked ? 'Saved' : 'Save'}</span>
      )}
    </button>
  )
}
