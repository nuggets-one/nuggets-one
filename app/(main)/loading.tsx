import { FeedSkeleton } from '@/components/feed/feed-skeleton'

export default function MainLoading() {
  return (
    <div aria-busy="true" aria-live="polite" data-testid="main-route-loading">
      <div className="mb-6 space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-border/40 motion-reduce:animate-none" />
        <div className="h-4 w-64 animate-pulse rounded bg-border/30 motion-reduce:animate-none" />
      </div>
      <FeedSkeleton count={6} />
    </div>
  )
}
