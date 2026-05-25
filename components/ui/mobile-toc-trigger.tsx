'use client'

import Link from 'next/link'
import type { MarkdownTocItem } from '@/lib/markdown/extract-markdown-toc'

type Props = {
  items: MarkdownTocItem[]
  activeId: string | null
}

export function MobileTocTrigger({ items, activeId }: Props) {
  if (items.length === 0) return null

  const activeItem = items.find((item) => item.id === activeId) ?? items[0]

  return (
    <details className="group mb-5 lg:hidden">
      <summary className="sticky top-[calc(var(--header-height)+8px)] z-20 list-none rounded-lg border border-border bg-surface/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              On this page
            </p>
            <p className="truncate text-xs font-medium text-primary">{activeItem?.text}</p>
          </div>
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted transition-transform group-open:rotate-180"
            aria-hidden="true"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m5 8 5 5 5-5" />
            </svg>
          </span>
        </div>
      </summary>

      <nav aria-label="Table of contents" className="mt-2 rounded-lg border border-border bg-surface p-2">
        <ul className="max-h-60 space-y-0.5 overflow-y-auto">
          {items.map((item) => {
            const isActive = item.id === activeId
            return (
              <li key={item.id}>
                <Link
                  href={`#${item.id}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={[
                    'block rounded-md px-2.5 py-1.5 text-sm leading-snug transition-colors',
                    isActive
                      ? 'bg-surface-raised font-medium text-primary'
                      : 'text-muted hover:bg-surface-raised hover:text-primary',
                  ].join(' ')}
                >
                  {item.text}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </details>
  )
}
