export function ArticleCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col rounded-xl border border-border-strong bg-surface overflow-hidden"
      aria-hidden="true"
    >
      <div className="aspect-video w-full bg-surface-raised animate-pulse motion-reduce:animate-none" />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex gap-2">
          <div className="h-4 w-20 rounded-full bg-surface-raised animate-pulse motion-reduce:animate-none" />
          <div className="ml-auto h-4 w-16 rounded-full bg-surface-raised animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="h-4 w-full rounded bg-surface-raised animate-pulse motion-reduce:animate-none" />
        <div className="h-4 w-4/5 rounded bg-surface-raised animate-pulse motion-reduce:animate-none" />
        <div className="h-3 w-full rounded bg-surface-raised animate-pulse motion-reduce:animate-none" />
        <div className="h-3 w-3/4 rounded bg-surface-raised animate-pulse motion-reduce:animate-none" />
        <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-2">
          <div className="h-4 w-28 rounded bg-surface-raised animate-pulse motion-reduce:animate-none" />
          <div className="h-8 w-8 rounded bg-surface-raised animate-pulse motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  )
}
