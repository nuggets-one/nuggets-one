'use client'

import { useEffect, useMemo, useState } from 'react'
import type { MarkdownTocItem } from '@/lib/markdown/extract-markdown-toc'
import { useActiveHeading } from '@/lib/ui/use-active-heading'
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
  publishedLabel: string
  readingTimeLabel: string
  tocItems: MarkdownTocItem[]
  scrollRootId: string
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, value))
}

export function ArticleDetailUtilityRail({
  articleId,
  title,
  href,
  sourceUrl,
  sourceHost,
  isAuthenticated,
  initialBookmarked,
  editHref = null,
  canDelete = false,
  publishedLabel,
  readingTimeLabel,
  tocItems,
  scrollRootId,
}: Props) {
  const [progress, setProgress] = useState(0)

  const activeId = useActiveHeading({
    items: tocItems,
    scrollRootId,
    scrollOffsetPx: 140,
  })

  const activeLabel = useMemo(() => {
    if (!activeId) return null
    return tocItems.find((item) => item.id === activeId)?.text ?? null
  }, [activeId, tocItems])

  useEffect(() => {
    const handleScroll = () => {
      const root = document.getElementById(scrollRootId)
      if (!root) return
      const rect = root.getBoundingClientRect()
      const viewportHeight = window.innerHeight || 1
      const totalScrollable = rect.height + viewportHeight
      if (totalScrollable <= 0) return
      const viewed = viewportHeight - rect.top
      const nextProgress = clampProgress((viewed / totalScrollable) * 100)
      setProgress(nextProgress)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [scrollRootId])

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24 space-y-5">
        <section className="rounded-xl border border-border bg-surface px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Actions</p>
          <div className="mt-3 flex items-center gap-1.5" role="group" aria-label="Article actions">
            <ShareButton title={title} href={href} variant="toolbar" />
            <BookmarkButton
              articleId={articleId}
              initialBookmarked={initialBookmarked}
              isAuthenticated={isAuthenticated}
              variant="toolbar"
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
        </section>

        <section className="rounded-xl border border-border bg-surface px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Reading</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Published</dt>
              <dd className="text-primary">{publishedLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Read time</dt>
              <dd className="text-primary">{readingTimeLabel}</dd>
            </div>
          </dl>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
              <span className="text-muted">Progress</span>
              <span className="tabular-nums text-primary">{Math.round(progress)}%</span>
            </div>
            <div className="h-1 rounded-full bg-rail">
              <div
                className="h-full rounded-full bg-primary/80 transition-[width] duration-200"
                style={{ width: `${Math.max(progress, 2)}%` }}
                aria-hidden="true"
              />
            </div>
            {activeLabel ? <p className="mt-2 text-xs leading-snug text-muted">{activeLabel}</p> : null}
          </div>
        </section>
      </div>
      <BookmarkBatchHydrator articleIds={[articleId]} />
    </aside>
  )
}
