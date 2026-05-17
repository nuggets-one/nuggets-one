'use client'

import { useEffect } from 'react'
import { lockScroll } from '@/lib/ui/scroll-lock'

/** Locks document scroll while `enabled` is true (nested-safe). */
export function useScrollLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    return lockScroll()
  }, [enabled])
}
