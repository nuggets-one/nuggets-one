export function CollectionCardSkeleton() {
  return (
    <div
      className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden"
      aria-hidden="true"
    >
      <div className="aspect-video w-full bg-surface-raised animate-pulse" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-4 w-full rounded bg-surface-raised animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-surface-raised animate-pulse" />
        <div className="h-3 w-4/5 rounded bg-surface-raised animate-pulse" />
        <div className="mt-2 flex items-center justify-between">
          <div className="h-3 w-24 rounded bg-surface-raised animate-pulse" />
          <div className="h-3 w-16 rounded bg-surface-raised animate-pulse" />
        </div>
      </div>
    </div>
  )
}
