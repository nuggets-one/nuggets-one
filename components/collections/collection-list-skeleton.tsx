import { CollectionCardSkeleton } from './collection-card-skeleton'

export function CollectionListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="space-y-4 rounded-2xl border border-border bg-surface p-4 md:p-5"
          aria-hidden="true"
        >
          <div className="h-6 w-1/3 rounded bg-surface-raised animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-surface-raised animate-pulse" />
          <CollectionCardSkeleton />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <CollectionCardSkeleton />
            <CollectionCardSkeleton />
            <CollectionCardSkeleton />
          </div>
        </div>
      ))}
    </div>
  )
}
