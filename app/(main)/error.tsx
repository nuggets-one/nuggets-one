'use client'

import { useEffect } from 'react'

export default function FeedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[FeedError]', error)
  }, [error])

  return (
    <div className="py-24 text-center">
      <p className="text-base font-semibold text-primary mb-1">
        Couldn&apos;t load nuggets.
      </p>
      <p className="text-sm text-muted mb-6">
        Something went wrong fetching the feed.
      </p>
      <button
        onClick={reset}
        className="text-sm font-medium text-primary underline underline-offset-2"
      >
        Retry
      </button>
    </div>
  )
}
