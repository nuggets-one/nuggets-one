import { BookmarkButton } from '@/components/ui/bookmark-button'
import { ShareButton } from '@/components/ui/share-button'
import { CardMoreButton } from '@/components/ui/card-more-button'
import { curatorChipFromDisplayName } from '@/lib/ui/author-curator-chip'

function formatCompactDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

type Props = {
  href: string
  title: string
  published_at: string
  sourceHost: string | null
  source_url: string | null
  articleId: string
  isAuthenticated: boolean
  initialBookmarked: boolean
  curatorDisplayName: string | null
  adminEditHref?: string | null
  deleteRedirectTo?: string
}

export function CardFooter({
  href,
  title,
  published_at,
  sourceHost,
  source_url,
  articleId,
  isAuthenticated,
  initialBookmarked,
  curatorDisplayName,
  adminEditHref = null,
  deleteRedirectTo = '/',
}: Props) {
  const canDelete = !!adminEditHref
  const compactDate = formatCompactDate(published_at)
  const authorBadgeLabel = curatorChipFromDisplayName(curatorDisplayName)
  const chipTitle = curatorDisplayName?.trim()
    ? `Curated by ${curatorDisplayName.trim()}`
    : 'Nuggets'

  return (
    <div className="mt-auto block px-4 py-2 md:border-t md:border-border">
      <div className="flex items-center justify-between gap-3">
        <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
          <div className="relative shrink-0">
            <span
              title={chipTitle}
              aria-label={chipTitle}
              className="flex h-6 w-6 select-none items-center justify-center rounded-full border border-primary-600/20 bg-primary-100 text-[9px] font-bold text-body-link dark:border-primary-900/55 dark:bg-primary-900/30"
            >
              {authorBadgeLabel}
            </span>
          </div>
          <span className="shrink-0">
            {compactDate}
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <div className="shrink-0">
            <ShareButton title={title} href={href} variant="footer" />
          </div>
          <div className="shrink-0">
            <BookmarkButton
              articleId={articleId}
              initialBookmarked={initialBookmarked}
              isAuthenticated={isAuthenticated}
              variant="footer"
            />
          </div>
          {(source_url || adminEditHref || canDelete) && (
            <div className="shrink-0">
              <CardMoreButton
                sourceUrl={source_url ?? ''}
                sourceHost={sourceHost}
                editHref={adminEditHref}
                canDelete={canDelete}
                articleId={canDelete ? articleId : undefined}
                deleteRedirectTo={deleteRedirectTo}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
