/**
 * Legacy Mongo article → v2 hero + article_media resolution.
 *
 * Field names match Project-Phoenix / Mongo `articles` collection
 * (see NUGGETS_V2_MIGRATION_PLAN §3.2, BLUEPRINT §12.2a, §1257).
 *
 * Source (attribution) is separate from card media:
 *   sourceUrl, externalLinks → articles.source_url (may be PDF/HTML)
 *   primaryMedia, supportingMedia, media, images, video, … → article_media + hero_*
 */

import { isImageUrl } from '../../lib/ui/is-image-url'
import { isPdfUrl } from '../../lib/ui/is-pdf-url'
import {
  extractYouTubeVideoId,
  isCanonicalYouTubeVideoId,
} from '../../lib/ui/youtube-video-id'

/** Loose Mongo article shape — strict:false legacy variants. */
export type LegacyMongoArticle = {
  [key: string]: unknown
  sourceUrl?: string
  externalLinks?: unknown
  primaryMedia?: unknown
  media?: unknown
  supportingMedia?: unknown
  images?: unknown
  video?: unknown
  documents?: unknown
  displayImageIndex?: unknown
  heroImage?: unknown
  hero_image?: unknown
  thumbnail?: unknown
  coverImage?: unknown
  image?: unknown
}

export type LegacyMediaCandidate = {
  url: string
  alt: string | null
  typeHint: string | null
  videoId: string | null
  thumbnailUrl: string | null
  isPrimary: boolean
  originField: string
}

export type ResolvedCardMediaRow = {
  url: string
  kind: 'image' | 'youtube'
  video_id: string | null
  hero_thumb_url: string
  sort_order: number
}

export type ResolvedLegacyMedia = {
  source_url: string | null
  /** Full gallery order (includes PDFs/docs) — for displayImageIndex lookup. */
  fullGallery: LegacyMediaCandidate[]
  /** Card-eligible rows only (images + YouTube). */
  cardMedia: ResolvedCardMediaRow[]
  heroIndex: number
}

function youTubePosterHqUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`
}

function normalizeUrlKey(url: string): string {
  return url.trim()
}

function parseMediaObject(
  raw: unknown,
  originField: string
): LegacyMediaCandidate | null {
  if (!raw) return null

  if (typeof raw === 'string') {
    const url = raw.trim()
    if (!url) return null
    return {
      url,
      alt: null,
      typeHint: null,
      videoId: extractYouTubeVideoId(url),
      thumbnailUrl: null,
      isPrimary: false,
      originField,
    }
  }

  if (typeof raw !== 'object') return null

  const obj = raw as Record<string, unknown>
  const url = String(obj.url ?? obj.src ?? obj.secure_url ?? '').trim()
  if (!url) return null

  const typeHint =
    typeof obj.type === 'string'
      ? obj.type
      : typeof obj.kind === 'string'
        ? obj.kind
        : typeof obj.mediaType === 'string'
          ? obj.mediaType
          : null

  const videoId =
    typeof obj.videoId === 'string'
      ? obj.videoId
      : typeof obj.video_id === 'string'
        ? obj.video_id
        : extractYouTubeVideoId(url)

  const thumbnailUrl =
    typeof obj.thumbnail_url === 'string'
      ? obj.thumbnail_url
      : typeof obj.thumbnailUrl === 'string'
        ? obj.thumbnailUrl
        : typeof obj.poster === 'string'
          ? obj.poster
          : null

  const isPrimary =
    obj.isPrimary === true ||
    obj.is_primary === true ||
    obj.primary === true

  const alt = typeof obj.alt === 'string' ? obj.alt : null

  return {
    url,
    alt,
    typeHint,
    videoId,
    thumbnailUrl,
    isPrimary,
    originField,
  }
}

function pushCandidate(list: LegacyMediaCandidate[], candidate: LegacyMediaCandidate | null) {
  if (!candidate) return
  const key = normalizeUrlKey(candidate.url)
  if (list.some((item) => normalizeUrlKey(item.url) === key)) return
  list.push(candidate)
}

function pushFromArray(
  list: LegacyMediaCandidate[],
  raw: unknown,
  originField: string
) {
  if (!Array.isArray(raw)) return
  raw.forEach((entry, index) => {
    pushCandidate(list, parseMediaObject(entry, `${originField}[${index}]`))
  })
}

function pushFromScalarKeys(doc: LegacyMongoArticle, list: LegacyMediaCandidate[]) {
  for (const key of ['heroImage', 'hero_image', 'thumbnail', 'coverImage', 'image'] as const) {
    pushCandidate(list, parseMediaObject(doc[key], key))
  }
}

/** Attribution URL — never used as card hero. */
export function resolveLegacySourceUrl(doc: LegacyMongoArticle): string | null {
  const fromSource = typeof doc.sourceUrl === 'string' ? doc.sourceUrl.trim() : ''
  if (fromSource) return fromSource
  return firstExternalLinkUrl(doc.externalLinks)
}

/** Legacy externalLinks: string[] or { url | href | link }[]. */
export function firstExternalLinkUrl(links: unknown): string | null {
  if (!Array.isArray(links) || links.length === 0) return null
  const first = links[0]
  if (typeof first === 'string') {
    const t = first.trim()
    return t || null
  }
  if (first && typeof first === 'object') {
    const obj = first as { url?: string; href?: string; link?: string }
    const u = obj.url ?? obj.href ?? obj.link
    if (typeof u === 'string') {
      const t = u.trim()
      return t || null
    }
  }
  return null
}

/**
 * Collect legacy gallery in editorial order (matches old card + detail carousel).
 * Includes PDFs/documents for displayImageIndex indexing only.
 */
export function collectLegacyGallery(doc: LegacyMongoArticle): LegacyMediaCandidate[] {
  const list: LegacyMediaCandidate[] = []

  pushCandidate(list, parseMediaObject(doc.primaryMedia, 'primaryMedia'))

  pushFromArray(list, doc.supportingMedia, 'supportingMedia')

  if (doc.media && typeof doc.media === 'object' && !Array.isArray(doc.media)) {
    pushCandidate(list, parseMediaObject(doc.media, 'media'))
  }
  pushFromArray(list, doc.media, 'media')

  pushFromArray(list, doc.images, 'images')

  pushCandidate(list, parseMediaObject(doc.video, 'video'))

  // documents[] are attribution attachments — not card heroes on legacy UI.
  pushFromScalarKeys(doc, list)

  return list
}

function isYoutubeCandidate(candidate: LegacyMediaCandidate): boolean {
  const typeRaw = (candidate.typeHint ?? '').toLowerCase()
  if (typeRaw.includes('youtube')) return true
  const id = candidate.videoId ?? extractYouTubeVideoId(candidate.url)
  return Boolean(id && isCanonicalYouTubeVideoId(id))
}

function isCardEligibleCandidate(candidate: LegacyMediaCandidate): boolean {
  if (isPdfUrl(candidate.url)) return false
  const typeRaw = (candidate.typeHint ?? '').toLowerCase()
  if (typeRaw.includes('document') || typeRaw.includes('pdf')) return false
  if (isYoutubeCandidate(candidate)) return true
  return isImageUrl(candidate.url)
}

function toCardRow(
  candidate: LegacyMediaCandidate,
  sort_order: number
): ResolvedCardMediaRow | null {
  if (!isCardEligibleCandidate(candidate)) return null

  if (isYoutubeCandidate(candidate)) {
    const videoId = candidate.videoId ?? extractYouTubeVideoId(candidate.url)
    if (!videoId || !isCanonicalYouTubeVideoId(videoId)) return null
    const thumb =
      candidate.thumbnailUrl && isImageUrl(candidate.thumbnailUrl)
        ? candidate.thumbnailUrl
        : youTubePosterHqUrl(videoId)
    return {
      url: candidate.url,
      kind: 'youtube',
      video_id: videoId,
      hero_thumb_url: thumb,
      sort_order,
    }
  }

  return {
    url: candidate.url,
    kind: 'image',
    video_id: null,
    hero_thumb_url: candidate.url,
    sort_order,
  }
}

function parseDisplayImageIndex(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  const index = Math.trunc(raw)
  return index >= 0 ? index : null
}

export function pickHeroIndexFromGallery(
  fullGallery: LegacyMediaCandidate[],
  cardMedia: ResolvedCardMediaRow[],
  displayImageIndex: number | null
): number {
  if (cardMedia.length === 0) return -1

  if (displayImageIndex !== null && displayImageIndex < fullGallery.length) {
    const chosenUrl = normalizeUrlKey(fullGallery[displayImageIndex].url)
    const fromDisplay = cardMedia.findIndex((row) => normalizeUrlKey(row.url) === chosenUrl)
    if (fromDisplay >= 0) return fromDisplay

    // displayImageIndex may point at a raster thumb on a YouTube parent row
    const parent = fullGallery[displayImageIndex]
    if (parent.thumbnailUrl) {
      const thumbKey = normalizeUrlKey(parent.thumbnailUrl)
      const fromThumb = cardMedia.findIndex(
        (row) => normalizeUrlKey(row.hero_thumb_url) === thumbKey
      )
      if (fromThumb >= 0) return fromThumb
    }
  }

  for (let i = 0; i < fullGallery.length; i++) {
    const candidate = fullGallery[i]
    if (!candidate.isPrimary || !isCardEligibleCandidate(candidate)) continue
    const key = normalizeUrlKey(candidate.url)
    const idx = cardMedia.findIndex((row) => normalizeUrlKey(row.url) === key)
    if (idx >= 0) return idx
  }

  // Prefer Cloudinary / known CDNs over generic hosts when multiple images exist.
  const cloudinaryIdx = cardMedia.findIndex((row) =>
    row.kind === 'image' && row.url.includes('res.cloudinary.com')
  )
  if (cloudinaryIdx >= 0) return cloudinaryIdx

  const firstImage = cardMedia.findIndex((row) => row.kind === 'image')
  if (firstImage >= 0) return firstImage

  return 0
}

/** Build card media rows + hero index from a legacy Mongo article document. */
export function resolveLegacyMedia(doc: LegacyMongoArticle): ResolvedLegacyMedia {
  const source_url = resolveLegacySourceUrl(doc)
  const fullGallery = collectLegacyGallery(doc)

  const cardMedia: ResolvedCardMediaRow[] = []
  for (const candidate of fullGallery) {
    const row = toCardRow(candidate, cardMedia.length)
    if (!row) continue
    const key = normalizeUrlKey(row.url)
    if (cardMedia.some((existing) => normalizeUrlKey(existing.url) === key)) continue
    cardMedia.push(row)
  }

  const displayImageIndex = parseDisplayImageIndex(doc.displayImageIndex)
  const heroIndex = pickHeroIndexFromGallery(fullGallery, cardMedia, displayImageIndex)

  return { source_url, fullGallery, cardMedia, heroIndex }
}

/** Whether Postgres hero should be rewritten from Mongo resolution. */
export function needsLegacyMediaRectification(
  current: {
    hero_thumb_url: string | null
    hero_media_kind: string | null
  },
  resolved: ResolvedLegacyMedia
): boolean {
  if (resolved.cardMedia.length === 0) return false

  const hero = resolved.cardMedia[resolved.heroIndex]
  if (!hero) return false

  const currentThumb = current.hero_thumb_url?.trim() ?? ''
  if (!currentThumb) return true
  if (isPdfUrl(currentThumb)) return true

  const expectedThumb = hero.hero_thumb_url.trim()
  if (normalizeUrlKey(currentThumb) === normalizeUrlKey(expectedThumb)) return false

  // Current thumb is not one of the legacy card images (e.g. PDF or stale URL).
  const allowed = new Set(
    resolved.cardMedia.flatMap((row) => [
      normalizeUrlKey(row.url),
      normalizeUrlKey(row.hero_thumb_url),
    ])
  )
  return !allowed.has(normalizeUrlKey(currentThumb))
}

/**
 * True when Postgres has fewer `article_media` rows than legacy card gallery
 * (e.g. hero was set but supporting images were never inserted).
 */
export function needsLegacyGallerySync(
  storedImageMediaCount: number,
  resolved: ResolvedLegacyMedia
): boolean {
  const legacyCount = resolved.cardMedia.length
  if (legacyCount === 0) return false
  if (legacyCount >= 2 && storedImageMediaCount < legacyCount) return true
  if (legacyCount === 1 && storedImageMediaCount === 0) return true
  return false
}

export function heroFieldsFromCardRow(row: ResolvedCardMediaRow): {
  hero_thumb_url: string
  hero_media_kind: 'image' | 'youtube'
  hero_video_id: string | null
} {
  return {
    hero_thumb_url: row.hero_thumb_url,
    hero_media_kind: row.kind,
    hero_video_id: row.video_id,
  }
}
