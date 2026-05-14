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
}: Props) {
  return (
    <>
      <div
        className="flex shrink-0 items-center gap-1 sm:gap-2"
        role="group"
        aria-label="Share and save"
      >
        <ShareButton title={title} href={href} variant="toolbar" />
        <BookmarkButton
          articleId={articleId}
          initialBookmarked={initialBookmarked}
          isAuthenticated={isAuthenticated}
          variant="toolbar"
        />
        {sourceUrl ? (
          <CardMoreButton
            sourceUrl={sourceUrl}
            sourceHost={sourceHost}
            menuPlacement="below"
            variant="toolbar"
          />
        ) : null}
      </div>
      <BookmarkBatchHydrator articleIds={[articleId]} />
    </>
  )
}
