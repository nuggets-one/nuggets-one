'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { ExternalLink, MoreVertical, Pencil } from 'lucide-react'

type Props = {
  sourceUrl: string
  sourceHost: string | null
  editHref?: string | null
  menuPlacement?: 'above' | 'below'
  variant?: 'default' | 'toolbar'
}

export function CardMoreButton({
  sourceUrl,
  sourceHost,
  editHref = null,
  menuPlacement = 'above',
  variant = 'default',
}: Props) {
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
        className={`flex items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-surface-raised hover:text-primary focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-surface ${
          variant === 'toolbar'
            ? 'h-10 w-10 min-h-[40px] min-w-[40px]'
            : 'min-h-[44px] min-w-[44px]'
        }`}
      >
        <MoreVertical size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-20 min-w-[10rem] rounded-xl border border-border bg-surface p-1 shadow-panel ring-1 ring-elevated ${
            menuPlacement === 'below' ? 'top-full mt-1' : 'bottom-full mb-1'
          }`}
        >
          {editHref ? (
            <Link
              href={editHref}
              role="menuitem"
              onClick={closeMenu}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-raised hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              <span>Edit nugget</span>
            </Link>
          ) : null}
          {sourceUrl ? (
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
          ) : null}
        </div>
      )}
    </div>
  )
}
