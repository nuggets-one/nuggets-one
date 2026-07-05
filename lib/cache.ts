// Cache tag registry — single source of truth.
// All revalidateTag calls in the app import from here.
// BLUEPRINT §11 / §2.a — tag names frozen.

import { revalidateTag } from 'next/cache'

// ─── Tag constructors ────────────────────────────────────────────────

export const CACHE_TAGS = {
  feedAll:         'feed:all',
  feedStandard:    'feed:standard',
  feedPulse:       'feed:pulse',
  feedCharts:      'feed:charts',
  feedTechVc:      'feed:tech_vc',
  feedGeopolitics: 'feed:geopolitics',
  feedLeadership:  'feed:leadership',
  article:         (id: string) => `article:${id}`,
  streamCounts:    'counts:streams',
  scopeCounts:     (stream: string) => `counts:scope:${stream}`,
  tagCounts:       (stream: string) => `counts:tags:${stream}`,
  tags:            'tags:official',
  collectionsList: 'collections:list',
  collection:      (id: string) => `collection:${id}`,
  /** Busts public legal footer/menu caches and all `/legal/[slug]` data reads. */
  legalDocuments:  'legal:documents',
  /** Busts cached `site_settings` reads (e.g. consumer disclaimer). */
  siteSettings:    'site:settings',
} as const

// ─── Revalidation helpers — called by admin publish handler (PR-14) ─

/**
 * Bust both feed tag buckets + the specific article.
 * Always bust both streams on any publish — cheap when stream is not
 * currently cached; avoids stale cross-stream state.
 * BLUEPRINT §11 / §2.a: "both feed tags always".
 */
// { expire: 0 } triggers hard invalidation in Next.js 16 (immediate expiry).
// Next.js 16 requires a second profile arg; { expire: 0 } is the hard-bust equivalent.
const HARD_BUST = { expire: 0 }

export function revalidateArticle(id: string): void {
  revalidateTag(CACHE_TAGS.feedAll, HARD_BUST)
  revalidateTag(CACHE_TAGS.feedStandard, HARD_BUST)
  revalidateTag(CACHE_TAGS.feedPulse, HARD_BUST)
  revalidateTag(CACHE_TAGS.feedCharts, HARD_BUST)
  revalidateTag(CACHE_TAGS.feedTechVc, HARD_BUST)
  revalidateTag(CACHE_TAGS.feedGeopolitics, HARD_BUST)
  revalidateTag(CACHE_TAGS.feedLeadership, HARD_BUST)
  revalidateTag(CACHE_TAGS.article(id), HARD_BUST)
  revalidateTag(CACHE_TAGS.streamCounts, HARD_BUST)
  revalidateTag(CACHE_TAGS.scopeCounts('standard'), HARD_BUST)
  revalidateTag(CACHE_TAGS.scopeCounts('pulse'), HARD_BUST)
  revalidateTag(CACHE_TAGS.scopeCounts('tech_vc'), HARD_BUST)
  revalidateTag(CACHE_TAGS.scopeCounts('all'), HARD_BUST)
  revalidateTag(CACHE_TAGS.tagCounts('standard'), HARD_BUST)
  revalidateTag(CACHE_TAGS.tagCounts('standard:global'), HARD_BUST)
  revalidateTag(CACHE_TAGS.tagCounts('standard:india'), HARD_BUST)
  revalidateTag(CACHE_TAGS.tagCounts('pulse'), HARD_BUST)
  revalidateTag(CACHE_TAGS.tagCounts('pulse:global'), HARD_BUST)
  revalidateTag(CACHE_TAGS.tagCounts('pulse:india'), HARD_BUST)
  revalidateTag(CACHE_TAGS.tagCounts('charts'), HARD_BUST)
  revalidateTag(CACHE_TAGS.tagCounts('tech_vc:global'), HARD_BUST)
  revalidateTag(CACHE_TAGS.tagCounts('tech_vc:india'), HARD_BUST)
  revalidateTag(CACHE_TAGS.tagCounts('geopolitics'), HARD_BUST)
  revalidateTag(CACHE_TAGS.tagCounts('leadership'), HARD_BUST)
  revalidateTag(CACHE_TAGS.tagCounts('all:global'), HARD_BUST)
  revalidateTag(CACHE_TAGS.tagCounts('all:india'), HARD_BUST)
}

/**
 * Bust official tag list — call when admin adds/edits a tag.
 * Wired in PR-14.
 */
export function revalidateOfficialTags(): void {
  revalidateTag(CACHE_TAGS.tags, HARD_BUST)
}

/** Call after any admin change to `legal_pages` (content, flags, order, create). */
export function revalidateLegalDocuments(): void {
  revalidateTag(CACHE_TAGS.legalDocuments, HARD_BUST)
}

/** Call after any admin change to `site_settings`. */
export function revalidateSiteSettings(): void {
  revalidateTag(CACHE_TAGS.siteSettings, HARD_BUST)
}

/** Call after any admin change to `community_collections` or its entries. */
export function revalidateCollection(id: string): void {
  revalidateTag(CACHE_TAGS.collection(id), HARD_BUST)
  revalidateTag(CACHE_TAGS.collectionsList, HARD_BUST)
}
