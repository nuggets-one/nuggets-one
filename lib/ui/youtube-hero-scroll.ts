/** Scroll target for YouTube hero poster on nugget detail. */
export const NUGGET_YOUTUBE_HERO_ID = 'nugget-youtube-hero'

/** Scroll root for long nugget body (TOC + jump FAB). */
export const NUGGET_DOC_BODY_ID = 'nugget-doc-body'

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function scrollYouTubeHeroIntoView(): void {
  if (typeof document === 'undefined') return
  document.getElementById(NUGGET_YOUTUBE_HERO_ID)?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  })
}
