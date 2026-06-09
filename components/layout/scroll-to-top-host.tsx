'use client'

import dynamic from 'next/dynamic'

const ScrollToTopButton = dynamic(
  () =>
    import('@/components/ui/scroll-to-top-button').then((m) => ({
      default: m.ScrollToTopButton,
    })),
  { ssr: false },
)

export function ScrollToTopHost() {
  return <ScrollToTopButton />
}
