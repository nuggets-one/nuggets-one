export function ArticleDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse pb-10" aria-hidden="true">
      <div className="px-4 pt-6 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
          <aside className="hidden lg:block">
            <div className="mb-3 h-3 w-24 rounded bg-surface-raised" />
            <div className="space-y-2 border-l border-border pl-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 w-full rounded bg-surface-raised" />
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-6 sm:space-y-7">
            <div className="flex flex-wrap gap-2">
              <div className="h-7 w-24 rounded-full bg-surface-raised" />
              <div className="h-7 w-20 rounded-full bg-surface-raised" />
              <div className="h-7 w-28 rounded-full bg-surface-raised" />
            </div>

            <div className="space-y-3">
              <div className="h-9 w-full max-w-3xl rounded bg-surface-raised sm:h-10" />
              <div className="h-9 w-4/5 max-w-2xl rounded bg-surface-raised sm:h-10" />
              <div className="flex items-center justify-between gap-3">
                <div className="h-4 w-48 rounded bg-surface-raised" />
                <div className="flex shrink-0 gap-2">
                  <div className="h-11 w-11 rounded-full bg-surface-raised" />
                  <div className="h-11 w-11 rounded-full bg-surface-raised" />
                </div>
              </div>
            </div>

            <div className="h-10 w-40 rounded-lg bg-surface-raised" />

            <div className="aspect-video w-full max-w-3xl rounded-2xl bg-surface-raised" />

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
      </div>
    </div>
  )
}
