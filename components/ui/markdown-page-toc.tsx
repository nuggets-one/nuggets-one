'use client'

import type { MarkdownTocItem } from '@/lib/markdown/extract-markdown-toc'
import { MarkdownTocAnchor } from '@/components/ui/markdown-toc-anchor'
import { MobileTocTrigger } from '@/components/ui/mobile-toc-trigger'
import { useActiveHeading } from '@/lib/ui/use-active-heading'

type Props = {
  items: MarkdownTocItem[]
  /** Element `id` of the scroll root containing headings with matching `id`s. */
  scrollRootId: string
  /** Sticky header offset — headings with top above this count as “passed”. */
  scrollOffsetPx?: number
}

export function MarkdownPageToc({
  items,
  scrollRootId,
  scrollOffsetPx = 112,
}: Props) {
  const activeId = useActiveHeading({ items, scrollRootId, scrollOffsetPx })

  if (items.length === 0) return null

  return (
    <>
      <MobileTocTrigger items={items} activeId={activeId} scrollOffsetPx={scrollOffsetPx} />

      <nav aria-label="Table of contents" className="hidden lg:block lg:sticky lg:top-24 lg:pt-1">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">On this page</p>
        <ul className="space-y-0.5 border-l border-border pr-3">
          {items.map((item) => {
            const active = activeId === item.id
            return (
              <li key={item.id}>
                <MarkdownTocAnchor
                  headingId={item.id}
                  scrollOffsetPx={scrollOffsetPx}
                  aria-current={active ? 'true' : undefined}
                  className={[
                    '-ml-px block border-l py-1.5 pl-4 pr-2 text-[12.5px] leading-snug transition-colors',
                    active
                      ? 'border-l-accent font-medium text-primary'
                      : 'border-transparent text-muted hover:border-border-strong hover:text-primary',
                  ].join(' ')}
                >
                  {item.text}
                </MarkdownTocAnchor>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
