'use client'

import Link from 'next/link'
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
  progressRootId: string
  scrollOffsetPx: number
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
  progressRootId,
  scrollOffsetPx,
}: Props) {
  const [progress, setProgress] = useState(0)

  const activeId = useActiveHeading({
    items: tocItems,
    scrollRootId,
    scrollOffsetPx,
  })

  const activeLabel = useMemo(() => {
    if (!activeId) return null
    return tocItems.find((item) => item.id === activeId)?.text ?? null
  }, [activeId, tocItems])

  useEffect(() => {
    const handleScroll = () => {
      const root = document.getElementById(progressRootId)
      if (!root) return
      const rect = root.getBoundingClientRect()
      const rootTop = window.scrollY + rect.top
      const start = rootTop - scrollOffsetPx
      const end = rootTop + rect.height - scrollOffsetPx
      const span = Math.max(end - start, 1)
      const nextProgress = clampProgress(((window.scrollY - start) / span) * 100)
      setProgress(nextProgress)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [progressRootId, scrollOffsetPx])

  return (
    <div className="h-full">
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
            <div
              className="h-1.5 rounded-full bg-border"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Reading progress"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            {activeLabel ? <p className="mt-2 text-xs leading-snug text-muted">{activeLabel}</p> : null}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface px-4 py-4">
          <Link
            href="/"
            className="text-sm font-medium text-primary underline underline-offset-2 transition-opacity hover:opacity-90"
          >
            Back to home
          </Link>
        </section>
      </div>
      <BookmarkBatchHydrator articleIds={[articleId]} />
    </div>
  )
}
