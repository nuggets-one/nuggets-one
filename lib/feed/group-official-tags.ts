import type { TagSummary, TagDimension } from '@/types/article'
import type { TagCounts } from '@/lib/queries/tag-counts'

export const FEED_DIMENSION_KEYS = ['format', 'domain', 'subtopic', 'source'] as const satisfies readonly TagDimension[]

export type FeedDimensionKey = (typeof FEED_DIMENSION_KEYS)[number]

/** User-facing section titles on Home (body chrome). */
export const FEED_DIMENSION_LABELS: Record<FeedDimensionKey, string> = {
  format: 'Content format',
  domain: 'Subject domain',
  subtopic: 'Subtopic',
  source: 'Source',
}

export type GroupedOfficialTags = {
  format: TagSummary[]
  domain: TagSummary[]
  subtopic: TagSummary[]
  source: TagSummary[]
  /** `tags.dimension` is null — still official; show in modal / optional band. */
  uncategorized: TagSummary[]
}

export function countForSlug(counts: TagCounts, slug: string): number {
  const n = counts[slug]
  return typeof n === 'number' && n > 0 ? n : 0
}

/**
 * Sort by descending article count, then label ascending (stable tie-break).
 */
export function sortTagsByCountDesc(
  tags: readonly TagSummary[],
  counts: TagCounts
): TagSummary[] {
  return [...tags].sort((a, b) => {
    const ca = countForSlug(counts, a.slug)
    const cb = countForSlug(counts, b.slug)
    if (cb !== ca) return cb - ca
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  })
}

/** Top N official tags by published count (ties broken by label). */
export function topOfficialTagsByCount(
  tags: readonly TagSummary[],
  counts: TagCounts,
  limit: number
): TagSummary[] {
  if (limit <= 0) return []
  return sortTagsByCountDesc(tags, counts).slice(0, limit)
}

export function groupTagsByDimension(tags: readonly TagSummary[]): GroupedOfficialTags {
  const empty: GroupedOfficialTags = {
    format: [],
    domain: [],
    subtopic: [],
    source: [],
    uncategorized: [],
  }
  for (const t of tags) {
    if (t.dimension === 'format') empty.format.push(t)
    else if (t.dimension === 'domain') empty.domain.push(t)
    else if (t.dimension === 'subtopic') empty.subtopic.push(t)
    else if (t.dimension === 'source') empty.source.push(t)
    else empty.uncategorized.push(t)
  }
  return empty
}

export function groupedSortedByCount(
  tags: readonly TagSummary[],
  counts: TagCounts
): GroupedOfficialTags {
  const g = groupTagsByDimension(tags)
  return {
    format: sortTagsByCountDesc(g.format, counts),
    domain: sortTagsByCountDesc(g.domain, counts),
    subtopic: sortTagsByCountDesc(g.subtopic, counts),
    source: sortTagsByCountDesc(g.source, counts),
    uncategorized: sortTagsByCountDesc(g.uncategorized, counts),
  }
}

/**
 * Tags shown in the public filter picker: drop zero-count rows unless the slug
 * is in the staged selection (so applied URL filters remain visible/uncheckable).
 * Counts come from `getTagCountsForStream` — same source as pill labels.
 */
export function filterTagsVisibleInPicker(
  list: readonly TagSummary[],
  counts: TagCounts,
  stagedSlugs: readonly string[]
): TagSummary[] {
  const staged = new Set(stagedSlugs)
  return list.filter(
    (t) => staged.has(t.slug) || countForSlug(counts, t.slug) > 0
  )
}

const DIMENSION_SORT_TIER: Record<TagDimension, number> = {
  format: 0,
  domain: 1,
  subtopic: 2,
  source: 3,
}

/**
 * Stable listing order for any flat list of tags (e.g. `listOfficialTags`):
 * format → domain → subtopic → source → uncategorized, then label A–Z.
 */
export function sortOfficialTagsByDimensionThenLabel(
  tags: readonly TagSummary[]
): TagSummary[] {
  return [...tags].sort((a, b) => {
    const ta =
      a.dimension !== null && a.dimension in DIMENSION_SORT_TIER
        ? DIMENSION_SORT_TIER[a.dimension]
        : 4
    const tb =
      b.dimension !== null && b.dimension in DIMENSION_SORT_TIER
        ? DIMENSION_SORT_TIER[b.dimension]
        : 4
    if (ta !== tb) return ta - tb
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  })
}
