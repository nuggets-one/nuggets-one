// ─── Feed / card types ───────────────────────────────────────────────

/**
 * Lean fields only — no content_markdown, no search_vector.
 * This is what ArticleCard receives as props.
 * Adding fields here widens the RSC payload — require justification.
 */
export type ArticleCardProps = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  /** Sanitized HTML from markdown excerpt — populated by attachExcerptHtml in lib/ui/excerpt-markdown.ts. Empty string when excerpt is null/empty. */
  excerptHtml: string
  content_stream: 'standard' | 'pulse'
  published_at: string        // ISO string — DB timestamptz serialized
  hero_thumb_url: string | null
  hero_alt_text: string | null
  hero_media_kind: 'image' | 'youtube' | null
  hero_video_id: string | null
  tag_slugs: string[]
  source_url: string | null
  /**
   * Up to 4 image rows from `article_media` (kind='image', sort_order ASC).
   * Populated only by the feed query (Phase 14); other surfaces leave it `[]`.
   * The card renders the multi-image grid when length ≥ 2; otherwise falls
   * back to single-hero rendering using `hero_thumb_url`.
   */
  images: CardImage[]
}

export type CardImage = {
  url: string
  alt: string | null
}

/**
 * Cursor for keyset pagination — (published_at DESC, id DESC).
 * Both fields required — partial cursors not accepted.
 */
export type FeedCursor = {
  published_at: string        // ISO string
  id: string                  // UUID
}

/**
 * Result shape from getFeedPage.
 */
export type FeedPage = {
  articles: ArticleCardProps[]
  nextCursor: FeedCursor | null   // null = no more pages
  stream: ContentStream
}

/**
 * Parameters for getFeedPage.
 */
export type FeedPageParams = {
  stream: ContentStream
  tags?: string[]             // tag slugs for AND filter — empty = no filter
  q?: string                  // committed search query — empty = no search
  cursor?: FeedCursor         // absent = first page
  limit?: number              // default 24 — do not exceed without perf review
}

// ─── Detail types ────────────────────────────────────────────────────

/**
 * Full article for the Nugget detail page.
 * Includes content_markdown — never send this to card components.
 */
export type ArticleDetail = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content_markdown: string | null
  content_stream: ContentStream
  published_at: string
  hero_thumb_url: string | null
  hero_alt_text: string | null
  hero_media_kind: 'image' | 'youtube' | null
  hero_video_id: string | null
  source_url: string | null
  tag_slugs: string[]
  tags: TagSummary[]          // joined for display on detail page
}

// ─── Tag types ───────────────────────────────────────────────────────

export type TagSummary = {
  id: string
  slug: string
  label: string
  dimension: 'format' | 'domain' | 'subtopic' | null
  is_official: boolean
}

// ─── Shared enums ────────────────────────────────────────────────────

export type ContentStream = 'standard' | 'pulse'

export const CONTENT_STREAMS = ['standard', 'pulse'] as const

export const DEFAULT_STREAM: ContentStream = 'standard'

export const FEED_PAGE_SIZE = 24    // do not change without perf review
