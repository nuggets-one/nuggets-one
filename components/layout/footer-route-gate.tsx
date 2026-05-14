'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** Normalized paths where the global footer is hidden (infinite-scroll feed). */
const NO_FOOTER_PATHS = new Set<string>(['/'])

function normalizePath(pathname: string): string {
  return pathname.replace(/\/$/, '') || '/'
}

export function FooterRouteGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (NO_FOOTER_PATHS.has(normalizePath(pathname))) {
    return null
  }
  return <>{children}</>
}
