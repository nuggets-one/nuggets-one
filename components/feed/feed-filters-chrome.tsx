'use client'

import type { ReactNode } from 'react'
import { useMobileSearchExpanded } from '@/components/layout/mobile-search-context'

/** Hides feed filter chrome while mobile header search overlay is open. */
export function FeedFiltersChrome({ children }: { children: ReactNode }) {
  const isSearchExpanded = useMobileSearchExpanded()

  if (isSearchExpanded) {
    return null
  }

  return <>{children}</>
}
