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
  variant?: 'card' | 'detail' | 'footer' | 'toolbar'
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
          : variant === 'toolbar'
            ? 'h-10 w-10 min-h-[40px] min-w-[40px] rounded-full hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface'
          : variant === 'footer'
            ? 'rounded-full hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface'
            : 'h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg border border-border bg-transparent hover:bg-surface-raised active:bg-surface-raised/80'
      } ${
        variant === 'footer'
          ? bookmarked
            ? 'text-body-link'
            : 'text-muted hover:text-primary'
          : variant === 'toolbar'
          ? bookmarked
            ? 'text-primary'
            : 'text-muted hover:text-primary'
          : bookmarked
            ? 'text-accent'
            : 'text-muted hover:text-primary'
      } ${
        isPending ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <svg
        className={variant === 'toolbar' ? 'h-[18px] w-[18px]' : 'h-4 w-4'}
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
