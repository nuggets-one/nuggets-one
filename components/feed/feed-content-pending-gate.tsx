'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useFeedPending } from '@/components/feed/feed-pending-context'

type Props = {
  children: ReactNode
  contentKey: string
}

export function FeedContentPendingGate({ children, contentKey }: Props) {
  const { showFeedSkeleton, registerFeedContentKey, resolveFeedPending } =
    useFeedPending()

  registerFeedContentKey(contentKey)

  const prevContentKeyRef = useRef(contentKey)
  useEffect(() => {
    if (prevContentKeyRef.current === contentKey) return
    prevContentKeyRef.current = contentKey
    resolveFeedPending(contentKey)
  }, [contentKey, resolveFeedPending])

  return (
    <>
      <div className={showFeedSkeleton ? 'hidden' : undefined} aria-busy={showFeedSkeleton}>
        {children}
      </div>
      <div data-feed-content-version={contentKey} hidden aria-hidden="true" />
    </>
  )
}
