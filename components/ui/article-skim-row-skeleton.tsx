export function ArticleSkimRowSkeleton() {
  return (
    <div
      className="flex min-h-[88px] items-center gap-3 border-b border-border px-4 py-3"
      aria-hidden="true"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="h-4 w-full max-w-[90%] animate-pulse rounded bg-surface-raised motion-reduce:animate-none" />
        <div className="h-3 w-full max-w-[75%] animate-pulse rounded bg-surface-raised motion-reduce:animate-none" />
        <div className="h-3 w-24 animate-pulse rounded bg-surface-raised motion-reduce:animate-none" />
      </div>
      <div className="w-[96px] shrink-0 aspect-video animate-pulse rounded-lg bg-surface-raised motion-reduce:animate-none" />
    </div>
  )
}
