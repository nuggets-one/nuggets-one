'use client'

import Link from 'next/link'
import type { MarkdownTocItem } from '@/lib/markdown/extract-markdown-toc'
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
      <MobileTocTrigger items={items} activeId={activeId} />

      <nav aria-label="Table of contents" className="hidden lg:block lg:sticky lg:top-24">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">On this page</p>
        <ul className="space-y-0.5 border-l border-border">
          {items.map((item) => {
            const active = activeId === item.id
            return (
              <li key={item.id}>
                <Link
                  href={`#${item.id}`}
                  aria-current={active ? 'true' : undefined}
                  className={[
                    '-ml-px block border-l py-1.5 pl-4 pr-2 text-[13px] leading-snug transition-colors',
                    active
                      ? 'border-l-primary font-medium text-primary'
                      : 'border-transparent text-muted hover:border-border-strong hover:text-primary',
                  ].join(' ')}
                >
                  {item.text}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
