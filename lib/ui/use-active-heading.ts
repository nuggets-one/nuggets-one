'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MarkdownTocItem } from '@/lib/markdown/extract-markdown-toc'

type Options = {
  items: MarkdownTocItem[]
  scrollRootId: string
  scrollOffsetPx?: number
}

function pickActiveHeadingByPosition(
  root: HTMLElement,
  items: MarkdownTocItem[],
  scrollOffsetPx: number
): string | null {
  let current: string | null = null

  for (const item of items) {
    const heading = root.querySelector(`#${CSS.escape(item.id)}`)
    if (!(heading instanceof HTMLElement)) continue
    if (heading.getBoundingClientRect().top <= scrollOffsetPx) {
      current = item.id
    }
  }

  return current ?? items[0]?.id ?? null
}

export function useActiveHeading({
  items,
  scrollRootId,
  scrollOffsetPx = 112,
}: Options): string | null {
  const [activeId, setActiveId] = useState<string | null>(null)
  const rafRef = useRef<number | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const pickFromScroll = useCallback(() => {
    if (items.length === 0) return
    const root = document.getElementById(scrollRootId)
    if (!root) return
    setActiveId(pickActiveHeadingByPosition(root, items, scrollOffsetPx))
  }, [items, scrollOffsetPx, scrollRootId])

  const schedulePick = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      pickFromScroll()
    })
  }, [pickFromScroll])

  useEffect(() => {
    if (items.length === 0) return
    const root = document.getElementById(scrollRootId)
    if (!root) return

    if ('IntersectionObserver' in window) {
      observerRef.current?.disconnect()
      observerRef.current = new IntersectionObserver(
        () => {
          schedulePick()
        },
        {
          root: null,
          rootMargin: `-${scrollOffsetPx}px 0px -65% 0px`,
          threshold: [0, 1],
        }
      )

      for (const item of items) {
        const heading = root.querySelector(`#${CSS.escape(item.id)}`)
        if (heading instanceof HTMLElement) observerRef.current.observe(heading)
      }
    }

    const onHashChange = () => {
      const hashId = window.location.hash.replace(/^#/, '')
      if (hashId && items.some((item) => item.id === hashId)) {
        setActiveId(hashId)
      }
    }

    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('scroll', schedulePick, { passive: true })
    window.addEventListener('resize', schedulePick, { passive: true })

    const initialFrame = window.requestAnimationFrame(() => {
      const hashId = window.location.hash.replace(/^#/, '')
      if (hashId && items.some((item) => item.id === hashId)) {
        setActiveId(hashId)
        return
      }
      schedulePick()
    })

    return () => {
      window.cancelAnimationFrame(initialFrame)
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('scroll', schedulePick)
      window.removeEventListener('resize', schedulePick)
      observerRef.current?.disconnect()
      observerRef.current = null
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [items, schedulePick, scrollOffsetPx, scrollRootId])

  return activeId
}
