import type { ContentStream } from '@/types/article'

/** Official tag slugs that qualify an article for the Tech x VC stream (OR semantics). */
export const TECH_VC_TAG_SLUGS = ['technology', 'pe-vc', 'ai', 'semiconductors'] as const

export const GEOPOLITICS_TAG_SLUG = 'geopolitics' as const

export const LEADERSHIP_TAG_SLUG = 'leaders-investors-entrepreneurs' as const

/** Stable sort order for visible_streams arrays. */
export const CONTENT_STREAM_ORDER: ContentStream[] = [
  'standard',
  'pulse',
  'charts',
  'tech_vc',
  'geopolitics',
  'leadership',
]

export function tagsOverlapsAny(
  tagSlugs: string[],
  candidates: readonly string[]
): boolean {
  const set = new Set(tagSlugs)
  return candidates.some((slug) => set.has(slug))
}

/** Suggested primary stream from tags — does not override an explicit admin choice. */
export function inferContentStreamFromTags(tagSlugs: string[]): ContentStream | null {
  if (tagSlugs.includes(GEOPOLITICS_TAG_SLUG)) return 'geopolitics'
  if (tagSlugs.includes(LEADERSHIP_TAG_SLUG)) return 'leadership'
  if (tagsOverlapsAny(tagSlugs, TECH_VC_TAG_SLUGS)) return 'tech_vc'
  return null
}

/**
 * All feeds an article appears in: primary content_stream plus tag-gated streams.
 * Mirrors recompute_visible_streams() in Postgres.
 */
export function computeVisibleStreams(
  contentStream: ContentStream,
  tagSlugs: string[]
): ContentStream[] {
  const streams = new Set<ContentStream>([contentStream])
  if (tagSlugs.includes(GEOPOLITICS_TAG_SLUG)) streams.add('geopolitics')
  if (tagsOverlapsAny(tagSlugs, TECH_VC_TAG_SLUGS)) streams.add('tech_vc')
  if (tagSlugs.includes(LEADERSHIP_TAG_SLUG)) streams.add('leadership')
  return CONTENT_STREAM_ORDER.filter((stream) => streams.has(stream))
}

/** Tag-gated streams beyond the primary content_stream assignment. */
export function computeSecondaryVisibleStreams(
  contentStream: ContentStream,
  tagSlugs: string[]
): ContentStream[] {
  return computeVisibleStreams(contentStream, tagSlugs).filter((stream) => stream !== contentStream)
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
