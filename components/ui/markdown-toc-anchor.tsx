'use client'

import type { MouseEvent, ReactNode } from 'react'
import { scrollToMarkdownHeading } from '@/lib/ui/markdown-toc-scroll'

type Props = {
  headingId: string
  scrollOffsetPx: number
  className?: string
  children: ReactNode
  'aria-current'?: 'true' | undefined
}

export function MarkdownTocAnchor({
  headingId,
  scrollOffsetPx,
  className,
  children,
  'aria-current': ariaCurrent,
}: Props) {
  function handleTocClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation?.()
    scrollToMarkdownHeading(headingId, scrollOffsetPx)

    const details = e.currentTarget.closest('details')
    if (details?.open) {
      details.open = false
    }
  }

  return (
    <a
      href={`#${headingId}`}
      onClickCapture={handleTocClick}
      onClick={handleTocClick}
      aria-current={ariaCurrent}
      className={className}
    >
      {children}
    </a>
  )
}
