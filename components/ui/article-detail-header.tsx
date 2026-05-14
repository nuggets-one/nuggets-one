'use client'

import { useRouter } from 'next/navigation'
import { BookmarkBatchHydrator } from '@/components/ui/bookmark-batch-hydrator'
import { BookmarkButton } from '@/components/ui/bookmark-button'
import { CardMoreButton } from '@/components/ui/card-more-button'
import { ShareButton } from '@/components/ui/share-button'

type Props = {
  articleId: string
  title: string
  href: string
  inSheet?: boolean
  sourceUrl: string | null
  sourceHost: string | null
  isAuthenticated: boolean
  initialBookmarked: boolean
}

export function ArticleDetailHeader({
  articleId,
  title,
  href,
  inSheet = false,
  sourceUrl,
  sourceHost,
  isAuthenticated,
  initialBookmarked,
}: Props) {
  const router = useRouter()

  return (
    <>
      <div
        className={`z-20 flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5 ${
          inSheet ? 'sticky top-0 bg-header backdrop-blur-md' : 'bg-surface'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="inline-flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full bg-surface-raised text-[11px] font-bold text-muted ring-1 ring-elevated">
            N
          </div>
          <p className="truncate text-sm font-bold text-primary">Nuggets</p>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
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
          {inSheet ? (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Close nugget detail"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-raised hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      <BookmarkBatchHydrator articleIds={[articleId]} />
    </>
  )
}
