import { FeedSkeleton } from '@/components/feed/feed-skeleton'

export function CollectionDetailSkeleton() {
  return (
    <>
      {/* Header skeleton */}
      <div className="mb-8 space-y-3" aria-hidden="true">
        <div className="h-8 w-2/3 rounded bg-surface-raised animate-pulse" />
        <div className="h-4 w-full rounded bg-surface-raised animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-surface-raised animate-pulse" />
        <div className="h-3 w-32 rounded bg-surface-raised animate-pulse mt-4" />
      </div>

      {/* Article grid skeleton */}
      <FeedSkeleton count={6} />
    </>
  )
}
