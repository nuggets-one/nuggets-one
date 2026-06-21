import type { ContentStream } from '@/types/article'

/** Official tag slugs that qualify an article for the Tech x VC stream (OR semantics). */
export const TECH_VC_TAG_SLUGS = ['technology', 'pe-vc', 'ai', 'semiconductors'] as const

export const GEOPOLITICS_TAG_SLUG = 'geopolitics' as const

export const LEADERSHIP_TAG_SLUG = 'leaders-investors-entrepreneurs' as const

export function tagsOverlapsAny(
  tagSlugs: string[],
  candidates: readonly string[]
): boolean {
  const set = new Set(tagSlugs)
  return candidates.some((slug) => set.has(slug))
}

/** Geopolitics wins when both geopolitics and Tech x VC tags are present. */
export function inferContentStreamFromTags(tagSlugs: string[]): ContentStream | null {
  if (tagSlugs.includes(GEOPOLITICS_TAG_SLUG)) return 'geopolitics'
  if (tagsOverlapsAny(tagSlugs, TECH_VC_TAG_SLUGS)) return 'tech_vc'
  return null
}

export function validateStreamTagMembership(
  stream: ContentStream,
  tagSlugs: string[]
): boolean {
  if (stream === 'geopolitics') {
    return tagSlugs.includes(GEOPOLITICS_TAG_SLUG)
  }
  if (stream === 'leadership') {
    return tagSlugs.includes(LEADERSHIP_TAG_SLUG)
  }
  if (stream === 'tech_vc') {
    return tagsOverlapsAny(tagSlugs, TECH_VC_TAG_SLUGS)
  }
  return true
}

export function shouldHideTagSlugForStream(stream: ContentStream, slug: string): boolean {
  if (stream === 'geopolitics' && slug === GEOPOLITICS_TAG_SLUG) return true
  if (stream === 'leadership' && slug === LEADERSHIP_TAG_SLUG) return true
  if (stream === 'tech_vc' && (TECH_VC_TAG_SLUGS as readonly string[]).includes(slug)) {
    return true
  }
  return false
}
