// Cache tag registry — single source of truth.
// All revalidateTag calls in the app import from here.
// BLUEPRINT §11 / §2.a — tag names frozen.

import { revalidateTag } from 'next/cache'

// ─── Tag constructors ────────────────────────────────────────────────

export const CACHE_TAGS = {
  feedStandard:    'feed:standard',
  feedPulse:       'feed:pulse',
  feedCharts:      'feed:charts',
  article:         (id: string) => `article:${id}`,
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
  revalidateTag(CACHE_TAGS.feedStandard, HARD_BUST)
  revalidateTag(CACHE_TAGS.feedPulse, HARD_BUST)
  revalidateTag(CACHE_TAGS.feedCharts, HARD_BUST)
  revalidateTag(CACHE_TAGS.article(id), HARD_BUST)
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
