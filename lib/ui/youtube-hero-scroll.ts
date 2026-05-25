/** Scroll target for YouTube hero poster on nugget detail. */
export const NUGGET_YOUTUBE_HERO_ID = 'nugget-youtube-hero'

/** Scroll root for long nugget body (TOC + jump FAB). */
export const NUGGET_DOC_BODY_ID = 'nugget-doc-body'

/** Sheet inner scroll container (intercepted detail). */
export const SHEET_BODY_SELECTOR = '[data-sheet-body]'

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Scroll root for hero visibility checks — sheet body when open, else viewport. */
export function getYouTubeHeroScrollRoot(hero: HTMLElement): Element | null {
  if (typeof document === 'undefined') return null
  const sheetBody = document.querySelector(SHEET_BODY_SELECTOR)
  if (sheetBody instanceof HTMLElement && sheetBody.contains(hero)) {
    return sheetBody
  }
  return null
}

function isHeroMostlyVisible(hero: HTMLElement, root: Element | null): boolean {
  const heroRect = hero.getBoundingClientRect()
  if (root instanceof HTMLElement) {
    const rootRect = root.getBoundingClientRect()
    return heroRect.top >= rootRect.top - 8 && heroRect.top <= rootRect.top + rootRect.height * 0.35
  }
  return heroRect.top >= 0 && heroRect.top <= window.innerHeight * 0.35
}

function scrollHeroWithinRoot(hero: HTMLElement, root: HTMLElement): void {
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
  const rootRect = root.getBoundingClientRect()
  const heroRect = hero.getBoundingClientRect()
  const nextTop = root.scrollTop + (heroRect.top - rootRect.top)
  root.scrollTo({ top: Math.max(0, nextTop), behavior })
}

export type ScrollYouTubeHeroOptions = {
  /** Skip scroll when the poster is already near the top of the visible area. */
  onlyIfBelowFold?: boolean
}

export function scrollYouTubeHeroIntoView(options?: ScrollYouTubeHeroOptions): void {
  if (typeof document === 'undefined') return
  const hero = document.getElementById(NUGGET_YOUTUBE_HERO_ID)
  if (!hero) return

  const root = getYouTubeHeroScrollRoot(hero)
  if (options?.onlyIfBelowFold && isHeroMostlyVisible(hero, root)) {
    return
  }

  if (root instanceof HTMLElement) {
    scrollHeroWithinRoot(hero, root)
    return
  }

  hero.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  })
}
