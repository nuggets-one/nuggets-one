'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useFeedPending } from '@/components/feed/feed-pending-context'
import { readFeedContentVersionFromDom } from '@/lib/feed/feed-content-key'

/** Resolves feed pending when server-rendered feed markup updates. */
export function FeedPendingCoordinator() {
  const pathname = usePathname() ?? ''
  const isHome = pathname === '/'
  const { resolveFeedPending } = useFeedPending()

  useEffect(() => {
    if (!isHome) return undefined

    function checkDomVersion() {
      const domVersion = readFeedContentVersionFromDom()
      if (domVersion) {
        resolveFeedPending(domVersion)
      }
    }

    checkDomVersion()

    const observer = new MutationObserver(() => {
      checkDomVersion()
    })

    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-feed-content-version'],
      childList: true,
    })

    return () => observer.disconnect()
  }, [isHome, resolveFeedPending])

  return null
}
