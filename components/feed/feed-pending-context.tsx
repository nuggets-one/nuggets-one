'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { usePathname } from 'next/navigation'
import { FeedLoadingChrome } from '@/components/feed/feed-loading-chrome'
import { FeedSkeleton } from '@/components/feed/feed-skeleton'

type FeedPendingContextValue = {
  showFeedSkeleton: boolean
  markFeedPending: () => void
  beginFeedTransition: (fn: () => void) => void
  registerFeedContentKey: (contentKey: string) => void
  resolveFeedPending: (contentKey: string) => void
}

const FeedPendingContext = createContext<FeedPendingContextValue | null>(null)

export function FeedPendingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  const isHome = pathname === '/'

  const [feedPending, setFeedPending] = useState(false)
  const [displayContentKey, setDisplayContentKey] = useState('')
  const [pendingSinceContentKey, setPendingSinceContentKey] = useState<string | null>(
    null,
  )
  const [isTransitionPending, startTransition] = useTransition()
  const currentContentKeyRef = useRef('')

  const registerFeedContentKey = useCallback((contentKey: string) => {
    currentContentKeyRef.current = contentKey
    setDisplayContentKey((prev) => (prev === contentKey ? prev : contentKey))
  }, [])

  const markFeedPending = useCallback(() => {
    if (!isHome) return
    const key = currentContentKeyRef.current
    flushSync(() => {
      setPendingSinceContentKey(key)
      setFeedPending(true)
    })
  }, [isHome])

  const beginFeedTransition = useCallback(
    (fn: () => void) => {
      if (isHome) {
        const key = currentContentKeyRef.current
        flushSync(() => {
          setPendingSinceContentKey(key)
          setFeedPending(true)
        })
      }
      startTransition(fn)
    },
    [isHome, startTransition],
  )

  const resolveFeedPending = useCallback(
    (contentKey: string) => {
      if (!feedPending) return
      if (
        pendingSinceContentKey !== null &&
        contentKey !== pendingSinceContentKey
      ) {
        setFeedPending(false)
        setPendingSinceContentKey(null)
      }
    },
    [feedPending, pendingSinceContentKey],
  )

  useEffect(() => {
    if (!isHome) {
      startTransition(() => {
        setFeedPending(false)
        setPendingSinceContentKey(null)
      })
    }
  }, [isHome])

  const activeFeedPending = isHome && feedPending
  const showFeedSkeleton = isHome && (activeFeedPending || isTransitionPending)
  const skeletonKey = (isHome ? pendingSinceContentKey : null) ?? displayContentKey
  const showSkimSkeleton = skeletonKey.endsWith(':skim')

  return (
    <FeedPendingContext.Provider
      value={{
        showFeedSkeleton,
        markFeedPending,
        beginFeedTransition,
        registerFeedContentKey,
        resolveFeedPending,
      }}
    >
      {showFeedSkeleton ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 top-[var(--header-height)] z-[60] bg-bg"
          aria-busy="true"
          aria-live="polite"
          data-testid="feed-loading-skeleton"
        >
          <div className="mx-auto max-w-[90rem] px-4 pt-6 lg:px-6">
            <FeedLoadingChrome skimView={showSkimSkeleton} />
            <FeedSkeleton
              count={showSkimSkeleton ? 8 : 6}
              skimView={showSkimSkeleton}
            />
          </div>
        </div>
      ) : null}
      {children}
    </FeedPendingContext.Provider>
  )
}

export function useFeedPending() {
  const ctx = useContext(FeedPendingContext)
  if (!ctx) {
    throw new Error('useFeedPending must be used within FeedPendingProvider')
  }
  return ctx
}

/** Safe for header chrome outside guaranteed provider trees. */
export function useFeedPendingOptional() {
  return useContext(FeedPendingContext)
}
