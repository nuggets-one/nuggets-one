import { prefersReducedMotion, SHEET_BODY_SELECTOR } from '@/lib/ui/youtube-hero-scroll'

export const SCROLL_TOP_SENTINEL_SELECTOR = '[data-scroll-top-sentinel]'

/** Sticky header clearance for intersection observer root margin. */
export const SCROLL_TOP_ROOT_MARGIN = '-80px 0px 0px 0px'

export function isSheetOpen(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.hasAttribute('data-sheet-open')
}

export function getActiveScrollRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const sheetBody = document.querySelector(SHEET_BODY_SELECTOR)
  if (sheetBody instanceof HTMLElement) return sheetBody
  return null
}

export function readActiveScrollTop(): number {
  const root = getActiveScrollRoot()
  return root ? root.scrollTop : window.scrollY
}

/**
 * Subscribes to scroll on the active root (sheet body when open, else window).
 * Re-binds when `[data-sheet-body]` mounts/unmounts or `data-sheet-open` toggles.
 */
export function subscribeActiveScrollRoot(onScroll: () => void): () => void {
  if (typeof document === 'undefined') return () => {}

  let boundRoot: HTMLElement | null = getActiveScrollRoot()

  function unbindScrollTarget(): void {
    if (boundRoot) {
      boundRoot.removeEventListener('scroll', onScroll)
      return
    }
    window.removeEventListener('scroll', onScroll)
  }

  function bindScrollTarget(): void {
    const nextRoot = getActiveScrollRoot()
    if (nextRoot === boundRoot) return

    unbindScrollTarget()
    boundRoot = nextRoot
    ensureScrollTopSentinel(nextRoot)

    const target: HTMLElement | Window = nextRoot ?? window
    target.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }

  bindScrollTarget()

  const bodyObserver = new MutationObserver(bindScrollTarget)
  bodyObserver.observe(document.body, { childList: true, subtree: true })

  const htmlObserver = new MutationObserver(bindScrollTarget)
  htmlObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-sheet-open'],
  })

  return () => {
    unbindScrollTarget()
    bodyObserver.disconnect()
    htmlObserver.disconnect()
  }
}

export function scrollToTop(root: HTMLElement | null): void {
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
  if (root) {
    root.scrollTo({ top: 0, behavior })
    return
  }
  window.scrollTo({ top: 0, behavior })
}

export function isScrollToTopRouteEnabled(pathname: string, hasSheet = isSheetOpen()): boolean {
  if (hasSheet) return true
  if (pathname === '/') return true
  if (pathname.startsWith('/nuggets/')) return true
  return false
}

export function isMiniPlayerVisible(): boolean {
  if (typeof document === 'undefined') return false
  return document.querySelector('[data-youtube-mini-player]') instanceof HTMLElement
}

export function getMiniPlayerDockSide(): 'left' | 'right' | 'center' | null {
  if (typeof document === 'undefined') return null
  const player = document.querySelector('[data-youtube-mini-player]')
  if (!(player instanceof HTMLElement)) return null
  const side = player.getAttribute('data-dock-side')
  if (side === 'left' || side === 'right' || side === 'center') return side
  return null
}

export function isBlockingOverlayOpen(): boolean {
  if (typeof document === 'undefined') return false
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')
  for (const node of dialogs) {
    const label = node.getAttribute('aria-label') ?? ''
    if (label === 'Nugget detail') continue
    if (label === 'Notifications' || label.startsWith('Notifications,')) return true
    const style = window.getComputedStyle(node)
    const zIndex = Number.parseInt(style.zIndex, 10)
    if (style.position === 'fixed' && Number.isFinite(zIndex) && zIndex >= 110) return true
  }
  return false
}

export function ensureScrollTopSentinel(scrollRoot: HTMLElement | null): HTMLElement | null {
  if (typeof document === 'undefined') return null

  const container = scrollRoot ?? document.querySelector('main')
  if (!(container instanceof HTMLElement)) return null

  const existing = container.querySelector(SCROLL_TOP_SENTINEL_SELECTOR)
  if (existing instanceof HTMLElement) return existing

  const sentinel = document.createElement('div')
  sentinel.setAttribute('data-scroll-top-sentinel', '')
  sentinel.setAttribute('aria-hidden', 'true')
  sentinel.className = 'h-px w-full shrink-0 pointer-events-none'
  container.insertBefore(sentinel, container.firstChild)
  return sentinel
}
