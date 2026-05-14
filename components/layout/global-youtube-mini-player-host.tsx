'use client'

import dynamic from 'next/dynamic'

const GlobalYouTubeMiniPlayer = dynamic(
  () =>
    import('@/components/ui/global-youtube-mini-player').then((m) => ({
      default: m.GlobalYouTubeMiniPlayer,
    })),
  { ssr: false },
)

/**
 * Loads the feed mini-player chunk only on the client after hydration,
 * keeping the main layout JS lean for Core Web Vitals.
 */
export function GlobalYouTubeMiniPlayerHost() {
  return <GlobalYouTubeMiniPlayer />
}
