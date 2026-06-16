import { ArticleCardSkeleton } from '@/components/ui/article-card-skeleton'

export default function BookmarksLoading() {
  return (
    <div aria-busy="true" aria-live="polite" data-testid="bookmarks-loading">
      <div className="mb-6">
        <div className="h-8 w-40 animate-pulse rounded bg-border/40 motion-reduce:animate-none" />
        <div className="mt-2 h-4 w-52 animate-pulse rounded bg-border/30 motion-reduce:animate-none" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <ArticleCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}
