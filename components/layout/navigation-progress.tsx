'use client'

import { useEffect, useRef, useState, startTransition } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const SHOW_DELAY_MS = 150
const MID_STAGE_DELAY_MS = 320

function isInternalNavigationHref(href: string): boolean {
  if (!href || href.startsWith('#')) return false
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
    return false
  }
  return href.startsWith('/')
}

export function NavigationProgress() {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`
  const routeKeyRef = useRef(routeKey)

  const [visible, setVisible] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [stage, setStage] = useState<1 | 2>(1)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const midStageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return

      const href = anchor.getAttribute('href')
      if (!href || !isInternalNavigationHref(href)) return

      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current)
      }

      showTimerRef.current = setTimeout(() => {
        setCompleting(false)
        setStage(1)
        setVisible(true)
      }, SHOW_DELAY_MS)
    }

    document.addEventListener('click', onDocumentClick, true)
    return () => {
      document.removeEventListener('click', onDocumentClick, true)
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current)
        showTimerRef.current = null
      }
      if (midStageTimerRef.current) {
        clearTimeout(midStageTimerRef.current)
        midStageTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!visible || completing) return
    if (midStageTimerRef.current) {
      clearTimeout(midStageTimerRef.current)
    }
    midStageTimerRef.current = setTimeout(() => {
      setStage(2)
    }, MID_STAGE_DELAY_MS)

    return () => {
      if (midStageTimerRef.current) {
        clearTimeout(midStageTimerRef.current)
        midStageTimerRef.current = null
      }
    }
  }, [visible, completing])

  useEffect(() => {
    if (routeKey === routeKeyRef.current) return

    routeKeyRef.current = routeKey

    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
    if (midStageTimerRef.current) {
      clearTimeout(midStageTimerRef.current)
      midStageTimerRef.current = null
    }

    if (!visible) {
      startTransition(() => {
        setCompleting(false)
        setStage(1)
      })
      return
    }

    startTransition(() => {
      setCompleting(true)
    })
    const hideTimer = setTimeout(() => {
      setVisible(false)
      setCompleting(false)
      setStage(1)
    }, 200)

    return () => clearTimeout(hideTimer)
  }, [routeKey, visible])

  if (!visible) return null

  return (
    <div
      role="progressbar"
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top,0px)] z-[100] h-0.5 overflow-hidden bg-transparent"
    >
      <div
        className={`h-full bg-accent motion-reduce:transition-none ${
          completing
            ? 'w-full opacity-0 transition-[width,opacity] duration-200 ease-out'
            : stage === 2
              ? 'w-2/3 opacity-100 transition-[width] duration-300 ease-out'
              : 'w-1/3 opacity-100 motion-safe:animate-pulse transition-[width] duration-300 ease-out'
        }`}
      />
    </div>
  )
}
