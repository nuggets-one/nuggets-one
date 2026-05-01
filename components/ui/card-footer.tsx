import Link from 'next/link'
import { BookmarkButton } from '@/components/ui/bookmark-button'

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

type Props = {
  href: string
  published_at: string
  articleId: string
  isAuthenticated: boolean
  initialBookmarked: boolean
}

export function CardFooter({
  href,
  published_at,
  articleId,
  isAuthenticated,
  initialBookmarked,
}: Props) {
  return (
    <div className="mt-auto flex items-center gap-2 border-t border-border/70 px-4 py-2 text-xs">
      <Link
        href={href}
        className="inline-flex min-h-[44px] items-center rounded-full px-3 py-1 text-xs font-medium text-muted transition-colors hover:text-primary hover:bg-surface-raised active:bg-surface-raised"
      >
        View Full Article
      </Link>
      <span className="ml-auto shrink-0 text-muted">
        {formatDate(published_at)}
      </span>
      <div className="shrink-0">
        <BookmarkButton
          articleId={articleId}
          initialBookmarked={initialBookmarked}
          isAuthenticated={isAuthenticated}
          variant="card"
        />
      </div>
    </div>
  )
}
