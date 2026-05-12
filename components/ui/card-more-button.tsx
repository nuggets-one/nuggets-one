'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { ExternalLink, MoreVertical } from 'lucide-react'

type Props = {
  sourceUrl: string
  sourceHost: string | null
}

export function CardMoreButton({ sourceUrl, sourceHost }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  function toggleMenu(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    setOpen((value) => !value)
  }

  function closeMenu() {
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleMenu}
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <MoreVertical size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-20 mb-1 min-w-[10rem] rounded-xl border border-border bg-surface p-1 shadow-panel ring-1 ring-elevated"
        >
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={closeMenu}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-raised hover:text-primary"
            aria-label={
              sourceHost
                ? `Open source on ${sourceHost} (opens in new tab)`
                : 'Open source (opens in new tab)'
            }
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            <span>View Source</span>
          </a>
        </div>
      )}
    </div>
  )
}
