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
  card_preview: string | null
  /** Sanitized HTML from markdown card preview — populated by attachCardPreviewHtml in lib/ui/card-preview-markdown.ts. Empty string when card_preview is null/empty. */
  cardPreviewHtml: string
  content_stream: 'standard' | 'pulse'
  published_at: string        // ISO string — DB timestamptz serialized
  hero_thumb_url: string | null
  hero_alt_text: string | null
  hero_media_kind: 'image' | 'youtube' | null
  hero_video_id: string | null
  tag_slugs: string[]
  /** Display labels aligned to `tag_slugs` order: `tags.label` when present, else the slug as stored on the article. */
  tag_labels: string[]
  source_url: string | null
  /**
   * Denormalized curator display name for the card chip (null → badge "N").
   * Set on admin save/publish from `profiles.display_name`.
   */
  curator_display_name: string | null
  /**
   * Up to 4 image rows from `article_media` (kind='image', sort_order ASC).
   * Populated only by the feed query (Phase 14); other surfaces leave it `[]`.
   * Combined with `hero_thumb_url` via `buildCardGalleryImages` for the grid.
   */
  images: CardImage[]
  /**
   * Total `article_media` image rows for this article (before the 4-cell cap).
   * Used for the "+N" overlay on the 4th grid cell.
   */
  image_count: number
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
  totalCount?: number
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
  created_by: string | null
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

export type RelatedArticlePreview = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  published_at: string
  source_url: string | null
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

/** Map DB / ETL quirks to the app model (`video` → `youtube`; unknown → null). */
export function normalizeHeroMediaKind(value: unknown): 'image' | 'youtube' | null {
  if (value === 'image' || value === 'youtube') return value
  if (value === 'video') return 'youtube'
  return null
}
