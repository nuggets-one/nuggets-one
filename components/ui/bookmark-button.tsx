'use client'

// Logged-out: redirects to /login?next=<currentPath> — no auth modal (PRODUCT §0.7)

import { useState, type MouseEvent } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  articleId: string
  initialBookmarked: boolean
  isAuthenticated: boolean
  variant?: 'card' | 'detail'
}

async function toggleBookmark(
  articleId: string,
  currentlyBookmarked: boolean
): Promise<{ bookmarked: boolean; error: string | null }> {
  const supabase = createClient()

  if (currentlyBookmarked) {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('article_id', articleId)

    if (error) return { bookmarked: true, error: error.message }
    return { bookmarked: false, error: null }
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { bookmarked: false, error: 'not_authenticated' }

    const { error } = await supabase
      .from('bookmarks')
      .insert({ article_id: articleId, user_id: user.id })

    if (error) return { bookmarked: false, error: error.message }
    return { bookmarked: true, error: null }
  }
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

  async function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    if (isPending) return
    setIsPending(true)

    // Optimistic update
    setBookmarked((prev) => !prev)

    const result = await toggleBookmark(articleId, bookmarked)

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
          : 'p-1 rounded hover:bg-surface-raised active:bg-surface-raised/80'
      } ${bookmarked ? 'text-accent' : 'text-muted hover:text-primary'} ${
        isPending ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <svg
        className="w-4 h-4"
        fill={bookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
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
