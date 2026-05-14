export function ArticleDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse pb-8" aria-hidden="true">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-surface-raised" />
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-surface-raised" />
            <div className="h-2.5 w-28 rounded bg-surface-raised" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-11 w-11 rounded-full bg-surface-raised" />
          <div className="h-10 w-10 rounded-full bg-surface-raised" />
          <div className="h-10 w-10 rounded-full bg-surface-raised" />
        </div>
      </div>

      <div className="space-y-6 px-4 pt-5 sm:space-y-7 sm:px-5 sm:pt-6">
        <div className="flex flex-wrap gap-2">
          <div className="h-7 w-24 rounded-full bg-surface-raised" />
          <div className="h-7 w-20 rounded-full bg-surface-raised" />
          <div className="h-7 w-28 rounded-full bg-surface-raised" />
        </div>

        <div className="space-y-3">
          <div className="h-9 w-full max-w-2xl rounded bg-surface-raised" />
          <div className="h-9 w-4/5 max-w-xl rounded bg-surface-raised" />
          <div className="h-4 w-48 rounded bg-surface-raised" />
        </div>

        <div className="h-9 w-36 rounded-full bg-surface-raised" />

        <div className="aspect-video w-full rounded-2xl bg-surface-raised" />

        <div className="max-w-prose space-y-4">
          <div className="h-16 w-full rounded-xl bg-surface-raised" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`h-4 rounded bg-surface-raised ${
                i % 4 === 3 ? 'w-3/5' : 'w-full'
              }`}
            />
          ))}
          <div className="h-px w-full bg-surface-raised" />
          <div className="h-3 w-11/12 rounded bg-surface-raised" />
        </div>
      </div>
    </div>
  )
}
