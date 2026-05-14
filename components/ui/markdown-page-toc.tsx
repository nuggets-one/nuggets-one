'use client'

import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MarkdownTocItem } from '@/lib/markdown/extract-markdown-toc'

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
  const [activeId, setActiveId] = useState<string | null>(null)
  const rafRef = useRef<number | undefined>(undefined)

  const pickActiveFromScroll = useCallback(() => {
    if (items.length === 0) return
    const root = document.getElementById(scrollRootId)
    if (!root) return

    let current: string | null = null
    for (const item of items) {
      const el = root.querySelector(`#${CSS.escape(item.id)}`)
      if (!(el instanceof HTMLElement)) continue
      if (el.getBoundingClientRect().top <= scrollOffsetPx) {
        current = item.id
      }
    }
    setActiveId(current ?? items[0]?.id ?? null)
  }, [items, scrollOffsetPx, scrollRootId])

  const schedulePick = useCallback(() => {
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = undefined
      pickActiveFromScroll()
    })
  }, [pickActiveFromScroll])

  useLayoutEffect(() => {
    const run = () => {
      const hashId = window.location.hash.replace(/^#/, '')
      if (hashId && items.some((x) => x.id === hashId)) {
        setActiveId(hashId)
        return
      }
      pickActiveFromScroll()
    }
    const frame = requestAnimationFrame(run)
    return () => cancelAnimationFrame(frame)
  }, [items, pickActiveFromScroll])

  useEffect(() => {
    const onHash = () => {
      const id = window.location.hash.replace(/^#/, '')
      if (id && items.some((x) => x.id === id)) setActiveId(id)
    }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('scroll', schedulePick, { passive: true })
    window.addEventListener('resize', schedulePick, { passive: true })
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('scroll', schedulePick)
      window.removeEventListener('resize', schedulePick)
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current)
    }
  }, [items, schedulePick])

  if (items.length === 0) return null

  return (
    <>
      <div className="mb-6 lg:hidden" role="navigation" aria-label="On this page">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">On this page</p>
        <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto rounded-lg border border-border bg-surface-raised p-3 text-sm">
          {items.map((item) => {
            const active = activeId === item.id
            return (
              <li key={item.id}>
                <Link
                  href={`#${item.id}`}
                  aria-current={active ? 'true' : undefined}
                  className={`block py-1 transition-colors ${
                    active
                      ? 'font-medium text-accent'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  {item.text}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      <nav aria-label="Table of contents" className="hidden lg:block lg:sticky lg:top-24">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">On this page</p>
        <ul className="space-y-0.5 border-l border-border">
          {items.map((item) => {
            const active = activeId === item.id
            return (
              <li key={item.id}>
                <Link
                  href={`#${item.id}`}
                  aria-current={active ? 'true' : undefined}
                  className={[
                    '-ml-px block border-l-2 py-1.5 pl-4 text-[13px] leading-snug transition-colors',
                    active
                      ? 'border-l-accent font-medium text-accent'
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
