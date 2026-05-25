export function ArticleDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[90rem] animate-pulse pb-12" aria-hidden="true">
      <div className="px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="lg:grid lg:grid-cols-[minmax(180px,220px)_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[minmax(180px,220px)_minmax(0,68ch)_minmax(190px,240px)] xl:gap-12">
          <aside className="hidden lg:block">
            <div className="mb-3 h-3 w-24 rounded bg-surface-raised" />
            <div className="space-y-2 border-l border-border pl-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 w-full rounded bg-surface-raised" />
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-8 sm:space-y-10">
            <div className="flex flex-wrap gap-2">
              <div className="h-4 w-20 rounded bg-surface-raised" />
              <div className="h-4 w-28 rounded bg-surface-raised" />
              <div className="h-4 w-24 rounded bg-surface-raised" />
            </div>

            <div className="space-y-4">
              <div className="h-10 w-full rounded bg-surface-raised sm:h-12" />
              <div className="h-10 w-4/5 rounded bg-surface-raised sm:h-12" />
              <div className="h-6 w-2/3 rounded bg-surface-raised" />
            </div>

            <div className="h-8 w-36 rounded-md bg-surface-raised" />

            <div className="aspect-video w-full rounded-2xl bg-surface-raised" />

            <div className="space-y-4">
              <div className="h-24 w-full rounded-xl bg-surface-raised" />
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-4 rounded bg-surface-raised ${
                    i % 4 === 3 ? 'w-3/5' : 'w-full'
                  }`}
                />
              ))}
              <div className="h-px w-full bg-surface-raised" />
              <div className="h-20 w-full rounded-xl bg-surface-raised" />
              <div className="h-28 w-full rounded-xl bg-surface-raised" />
            </div>
          </div>

          <aside className="hidden xl:block">
            <div className="space-y-4 rounded-xl border border-border p-4">
              <div className="h-3 w-20 rounded bg-surface-raised" />
              <div className="flex gap-2">
                <div className="h-10 w-10 rounded-full bg-surface-raised" />
                <div className="h-10 w-10 rounded-full bg-surface-raised" />
                <div className="h-10 w-10 rounded-full bg-surface-raised" />
              </div>
            </div>
            <div className="mt-4 space-y-3 rounded-xl border border-border p-4">
              <div className="h-3 w-24 rounded bg-surface-raised" />
              <div className="h-3 w-full rounded bg-surface-raised" />
              <div className="h-3 w-5/6 rounded bg-surface-raised" />
              <div className="h-2 w-full rounded bg-surface-raised" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
