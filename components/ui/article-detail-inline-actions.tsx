'use client'

import { BookmarkBatchHydrator } from '@/components/ui/bookmark-batch-hydrator'
import { BookmarkButton } from '@/components/ui/bookmark-button'
import { CardMoreButton } from '@/components/ui/card-more-button'
import { ShareButton } from '@/components/ui/share-button'

type Props = {
  articleId: string
  title: string
  href: string
  sourceUrl: string | null
  sourceHost: string | null
  isAuthenticated: boolean
  initialBookmarked: boolean
  editHref?: string | null
  canDelete?: boolean
}

/**
 * Share / bookmark / overflow for the **full-page** nugget view — sits on the
 * meta row (e.g. next to the date) so we do not duplicate the site header.
 */
export function ArticleDetailInlineActions({
  articleId,
  title,
  href,
  sourceUrl,
  sourceHost,
  isAuthenticated,
  initialBookmarked,
  editHref = null,
  canDelete = false,
}: Props) {
  return (
    <>
      <div
        className="flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-surface px-1 py-1"
        role="group"
        aria-label="Share and save"
      >
        <ShareButton title={title} href={href} variant="footer" />
        <BookmarkButton
          articleId={articleId}
          initialBookmarked={initialBookmarked}
          isAuthenticated={isAuthenticated}
          variant="footer"
        />
        {(sourceUrl || editHref || canDelete) ? (
          <CardMoreButton
            sourceUrl={sourceUrl ?? ''}
            sourceHost={sourceHost}
            editHref={editHref}
            canDelete={canDelete}
            articleId={articleId}
            menuPlacement="below"
            variant="toolbar"
          />
        ) : null}
      </div>
      <BookmarkBatchHydrator articleIds={[articleId]} />
    </>
  )
}
