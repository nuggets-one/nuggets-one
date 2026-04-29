export function ArticleDetailSkeleton() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-pulse" aria-hidden="true">
      {/* Tag + date row */}
      <div className="flex gap-3 mb-4">
        <div className="h-5 w-24 rounded-full bg-surface-raised" />
        <div className="h-5 w-20 rounded bg-surface-raised" />
      </div>
      {/* Title */}
      <div className="h-8 w-full rounded bg-surface-raised mb-2" />
      <div className="h-8 w-4/5 rounded bg-surface-raised mb-6" />
      {/* Hero image */}
      <div className="aspect-video w-full rounded-xl bg-surface-raised mb-8" />
      {/* Body lines */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`h-4 rounded bg-surface-raised mb-3 ${i % 4 === 3 ? 'w-3/5' : 'w-full'}`} />
      ))}
    </div>
  )
}
