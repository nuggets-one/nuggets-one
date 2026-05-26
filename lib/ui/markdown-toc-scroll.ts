import { prefersReducedMotion } from '@/lib/ui/youtube-hero-scroll'

/**
 * Scroll to a markdown heading anchor without Next.js client navigation.
 * Hash-only `Link` navigations on `/nuggets/[id]/[slug]` re-trigger the
 * intercepted detail sheet instead of scrolling in place.
 */
export function scrollToMarkdownHeading(headingId: string, scrollOffsetPx: number): boolean {
  if (typeof document === 'undefined') return false

  const heading = document.getElementById(headingId)
  if (!heading) return false

  const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
  const top = heading.getBoundingClientRect().top + window.scrollY - scrollOffsetPx
  window.scrollTo({ top: Math.max(0, top), behavior })

  return true
}
