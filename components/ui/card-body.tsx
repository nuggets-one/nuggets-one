'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

type Props = {
  href: string
  title: string
  cardPreviewHtml: string
  contentStream: 'standard' | 'pulse'
  displayTags: Array<{ slug: string; label: string }>
}

export function CardBody({
  href,
  title,
  cardPreviewHtml,
  contentStream,
  displayTags,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const previewText = cardPreviewHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const visibleTags = displayTags.slice(0, 3)
  const remainingTags = displayTags.slice(3)
  const overflowCount = Math.max(0, displayTags.length - visibleTags.length)
  const hasPreview = previewText.length > 0
  const filterHref = (slug: string) =>
    `/?stream=${encodeURIComponent(contentStream)}&tags=${encodeURIComponent(slug)}`

  return (
    <div className="flex flex-1 flex-col gap-1.5 px-4 pb-2 pt-1.5 text-left">
      {visibleTags.length > 0 && (
        <div className="flex min-w-0 flex-nowrap items-center gap-1 pb-0.5">
          {visibleTags.map((tag) => (
            <Link
              key={tag.slug}
              href={filterHref(tag.slug)}
              className="inline-flex shrink-0 items-center rounded-full border border-card-tag-border bg-card-tag-bg px-1.5 py-0.5 text-[10px] font-medium leading-4 text-card-tag-text transition-colors hover:border-card-tag-hover-border hover:bg-card-tag-hover-bg hover:text-card-tag-hover-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
            >
              {tag.label}
            </Link>
          ))}
          {overflowCount > 0 && (
            <details className="relative shrink-0">
              <summary className="list-none cursor-pointer text-[10px] font-medium leading-4 text-muted underline underline-offset-2 [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 rounded-sm">
                +{overflowCount} more
              </summary>
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[10rem] rounded-xl border border-border bg-rail p-2 shadow-panel ring-1 ring-elevated">
                <div className="flex flex-wrap gap-1.5">
                  {remainingTags.map((tag) => (
                    <Link
                      key={tag.slug}
                      href={filterHref(tag.slug)}
                      className="inline-flex items-center rounded-full border border-card-tag-border bg-card-tag-bg px-1.5 py-0.5 text-[10px] font-medium leading-4 text-card-tag-text transition-colors hover:border-card-tag-hover-border hover:bg-card-tag-hover-bg hover:text-card-tag-hover-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60"
                    >
                      {tag.label}
                    </Link>
                  ))}
                </div>
              </div>
            </details>
          )}
        </div>
      )}

      <Link href={href} className="flex min-h-[44px] items-start focus:outline-none">
        <h2 className="line-clamp-2 text-xs font-semibold leading-snug text-slate-900 transition-colors group-hover:text-primary-700 dark:text-slate-50 dark:group-hover:text-primary-400">
          {title}
        </h2>
      </Link>

      {hasPreview && (
        <div className="relative">
          <div
            className={`overflow-hidden text-[11px] leading-5 text-muted transition-[max-height] duration-200 ${
              expanded ? 'max-h-[16rem]' : 'max-h-[8.75rem]'
            } [&_a]:text-body-link [&_a]:no-underline [&_a:hover]:underline [&_blockquote]:ml-0 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-2.5 [&_blockquote]:italic [&_p]:m-0 [&_p]:mb-1 [&_strong]:font-semibold [&_strong]:text-primary`}
            dangerouslySetInnerHTML={{ __html: cardPreviewHtml }}
          />
          {!expanded && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface to-transparent md:hidden"
            />
          )}
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 border-t border-border pt-2 md:hidden">
        {hasPreview && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-raised hover:text-primary focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface"
            aria-label={expanded ? 'Collapse content' : 'Expand content inline'}
          >
            <span>{expanded ? 'Collapse' : 'Expand'}</span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        )}
        <Link
          href={href}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-raised hover:text-primary focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface"
        >
          <span>View Full Article</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M4.5 9L7.5 6L4.5 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </div>
  )
}
