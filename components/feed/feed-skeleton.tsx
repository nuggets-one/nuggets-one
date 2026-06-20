import { ArticleCardSkeleton } from '@/components/ui/article-card-skeleton'
import { ArticleSkimRowSkeleton } from '@/components/ui/article-skim-row-skeleton'

type Props = {
  count?: number
  skimView?: boolean
}

const cardGridClasses =
  'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4'
const cardGridDesktopOnlyClasses =
  'hidden grid-cols-1 gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4'

export function FeedSkeleton({ count = 6, skimView = false }: Props) {
  if (skimView) {
    return (
      <>
        <div className="flex flex-col md:hidden">
          {Array.from({ length: count }).map((_, i) => (
            <ArticleSkimRowSkeleton key={i} />
          ))}
        </div>
        <div className={cardGridDesktopOnlyClasses}>
          {Array.from({ length: count }).map((_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>
      </>
    )
  }

  return (
    <div className={cardGridClasses}>
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  )
}
