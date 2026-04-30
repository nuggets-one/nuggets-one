// scripts/migrate/migrate-articles.ts
// Migrates legacy Mongo articles → Postgres articles table
// Run: npm run etl:articles [--dry-run] [--limit=100|--limit N]
//
// Field mapping (Migration Plan §3.2):
//   isPublished (bool, ~98% presence) → status='published'|'draft'
//   status (string, ~2% presence) → wins over isPublished if present
//   contentStream 'both'|null|missing → 'standard'; 'pulse' → 'pulse'
//   content → content_markdown
//   sourceUrl / externalLinks[0] → source_url
//   created_at derived from ObjectId timestamp (no createdAt field in docs)
//   primaryMedia image → hero_thumb_url + article_media kind='image'
//   primaryMedia video → hero_media_kind='youtube' + hero_video_id + article_media kind='youtube'
//   hero_media_id → article_media.id (always set when media exists; null only if no media)
//   tags/tagIds (legacy shape variants) → article_tags join rows + tag_slugs[]

import { connectMongo, disconnectMongo } from './mongo-client'
import { db } from './supabase-client'
import { generateArticleSlug } from '../shared/slug'
import mongoose from 'mongoose'
import crypto from 'crypto'

const isDryRun = process.argv.includes('--dry-run')

function parseLimitFromArgv(argv: string[]): number | null {
  const eqArg = argv.find((a) => a.startsWith('--limit='))
  if (eqArg !== undefined) {
    const n = parseInt(eqArg.split('=')[1], 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const idx = argv.indexOf('--limit')
  if (idx !== -1) {
    const next = argv[idx + 1]
    if (next !== undefined && !next.startsWith('-')) {
      const n = parseInt(next, 10)
      return Number.isFinite(n) && n > 0 ? n : null
    }
  }
  return null
}

const LIMIT = parseLimitFromArgv(process.argv)

// Legacy Mongo Article schema — strict:false absorbs all legacy field variants
const ArticleSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  title: String,
  excerpt: String,
  content: String,
  contentStream: String,
  status: String,
  isPublished: Boolean,
  publishedAt: Date,
  slug: String,
  tags: [{ slug: String, label: String }],
  sourceUrl: String,
  externalLinks: [String],
  primaryMedia: {
    url: String,
    alt: String,
    type: String,   // 'image' | 'video'
    videoId: String,
  },
}, { strict: false })

const MongoArticle = mongoose.models.Article ||
  mongoose.model('Article', ArticleSchema, 'articles')

// Migration Plan §3.2: status wins if present; else fall back to isPublished boolean
function mapStatus(doc: any): 'published' | 'draft' {
  if (doc.status === 'published') return 'published'
  if (doc.status === 'draft') return 'draft'
  return doc.isPublished === true ? 'published' : 'draft'
}

// Blueprint §12.2: 'both'|null|undefined → 'standard'; 'pulse' → 'pulse'
function mapContentStream(raw: string | null | undefined): 'standard' | 'pulse' {
  return raw === 'pulse' ? 'pulse' : 'standard'
}

function normalizeSlug(raw: string | null | undefined): string | null {
  const slug = (raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || null
}

// Derive hero fields + article_media payload from primaryMedia
// Blueprint §12.2a: hero_media_id must always be set when media exists
function deriveMedia(primaryMedia: any): {
  hero_thumb_url: string | null
  hero_alt_text: string | null
  hero_media_kind: 'image' | 'youtube' | null
  hero_video_id: string | null
  mediaRow: { url: string; kind: 'image' | 'youtube'; video_id: string | null } | null
} {
  if (!primaryMedia?.url) {
    return { hero_thumb_url: null, hero_alt_text: null, hero_media_kind: null, hero_video_id: null, mediaRow: null }
  }

  const typeRaw = String(primaryMedia.type ?? primaryMedia.kind ?? primaryMedia.mediaType ?? '').toLowerCase()
  const isYoutube = typeRaw.includes('youtube')
  const isVideo = typeRaw.includes('video') || isYoutube
  const inferredVideoId = typeof primaryMedia.videoId === 'string'
    ? primaryMedia.videoId
    : extractYouTubeVideoId(primaryMedia.url)

  if (isVideo && inferredVideoId) {
    return {
      hero_thumb_url: typeof primaryMedia.thumbnail_url === 'string' ? primaryMedia.thumbnail_url : null,
      hero_alt_text: primaryMedia.alt || null,
      hero_media_kind: 'youtube',
      hero_video_id: inferredVideoId,
      mediaRow: { url: primaryMedia.url, kind: 'youtube', video_id: inferredVideoId },
    }
  }

  return {
    hero_thumb_url: primaryMedia.url,
    hero_alt_text: primaryMedia.alt || null,
    hero_media_kind: 'image',
    hero_video_id: null,
    mediaRow: { url: primaryMedia.url, kind: 'image', video_id: null },
  }
}

function extractYouTubeVideoId(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) return null
  const raw = url.trim()
  const shortMatch = raw.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/)
  if (shortMatch) return shortMatch[1]
  const longMatch = raw.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)
  if (longMatch) return longMatch[1]
  const embedMatch = raw.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/)
  if (embedMatch) return embedMatch[1]
  return null
}

/**
 * Legacy media appears under several shapes: primaryMedia, media[], heroImage, etc.
 * Normalize to the shape expected by deriveMedia().
 */
function pickPrimaryMedia(doc: any): { url: string; alt?: string; type?: string; videoId?: string } | null {
  const candidate = doc.primaryMedia
  if (candidate && typeof candidate === 'object') {
    const url = String(candidate.url ?? candidate.src ?? candidate.secure_url ?? '').trim()
    if (url) {
      return {
        url,
        alt: typeof candidate.alt === 'string' ? candidate.alt : undefined,
        type: typeof candidate.type === 'string' ? candidate.type : undefined,
        videoId: typeof candidate.videoId === 'string' ? candidate.videoId : undefined,
      }
    }
  }

  if (doc.media && typeof doc.media === 'object' && !Array.isArray(doc.media)) {
    const url = String(doc.media.url ?? doc.media.src ?? doc.media.secure_url ?? '').trim()
    if (url) {
      return {
        url,
        alt: typeof doc.media.alt === 'string' ? doc.media.alt : undefined,
        type: typeof doc.media.type === 'string' ? doc.media.type : undefined,
        videoId: typeof doc.media.videoId === 'string' ? doc.media.videoId : undefined,
      }
    }
  }

  if (Array.isArray(doc.media)) {
    for (const m of doc.media) {
      if (!m || typeof m !== 'object') continue
      const url = String(m.url ?? m.src ?? m.secure_url ?? '').trim()
      if (!url) continue
      const kind = String(m.type ?? m.kind ?? m.mediaType ?? '').toLowerCase()
      const videoId = typeof m.videoId === 'string' ? m.videoId : undefined
      return {
        url,
        alt: typeof m.alt === 'string' ? m.alt : undefined,
        type: kind.includes('video') || videoId ? 'video' : 'image',
        videoId,
      }
    }
  }

  for (const key of ['heroImage', 'hero_image', 'thumbnail', 'coverImage', 'image']) {
    const raw = doc[key]
    if (typeof raw === 'string' && raw.trim()) {
      return { url: raw.trim(), type: 'image' }
    }
    if (raw && typeof raw === 'object') {
      const url = String(raw.url ?? raw.src ?? raw.secure_url ?? '').trim()
      if (url) return { url, alt: typeof raw.alt === 'string' ? raw.alt : undefined, type: 'image' }
    }
  }

  return null
}

// Derive created_at from ObjectId timestamp (Migration Plan §3.2: no createdAt field on docs)
function objectIdToDate(id: mongoose.Types.ObjectId): string {
  return new Date(parseInt(id.toString().slice(0, 8), 16) * 1000).toISOString()
}

/** Legacy externalLinks may be string[] or { url }[] (or mixed). */
function firstExternalLinkUrl(links: unknown): string | null {
  if (!Array.isArray(links) || links.length === 0) return null
  const first = links[0]
  if (typeof first === 'string') {
    const t = first.trim()
    return t || null
  }
  if (first && typeof first === 'object') {
    const u = (first as { url?: string; href?: string; link?: string }).url
      ?? (first as { href?: string }).href
      ?? (first as { link?: string }).link
    if (typeof u === 'string') {
      const t = u.trim()
      return t || null
    }
  }
  return null
}

function resolveTagSlugs(doc: any, mongoTagIdToSlug: Map<string, string>): string[] {
  const out = new Set<string>()

  if (Array.isArray(doc.tags)) {
    for (const t of doc.tags) {
      if (typeof t === 'string') {
        const s = normalizeSlug(t)
        if (s) out.add(s)
        continue
      }
      if (t && typeof t === 'object') {
        const s = normalizeSlug((t.slug as string | undefined) ?? (t.label as string | undefined) ?? (t.name as string | undefined))
        if (s) out.add(s)
      }
    }
  }

  if (Array.isArray(doc.tagIds)) {
    for (const tagId of doc.tagIds) {
      const key = String(tagId)
      const s = mongoTagIdToSlug.get(key)
      if (s) out.add(s)
    }
  }

  return [...out]
}

async function main() {
  console.log(
    `\n📦 Article migration ${isDryRun ? '[DRY RUN]' : '[LIVE]'}${LIMIT ? ` [LIMIT ${LIMIT}]` : ''}\n`
  )

  await connectMongo()

  // Build tag slug → postgres id map for article_tags population
  const { data: tagRows, error: tagFetchErr } = await db.from('tags').select('id, slug, legacy_mongo_id')
  if (tagFetchErr) throw new Error(`Failed to fetch tags: ${tagFetchErr.message}`)
  const tagSlugToId = new Map<string, string>(
    (tagRows ?? []).map((r) => [r.slug as string, r.id as string])
  )
  const mongoTagIdToSlug = new Map<string, string>(
    (tagRows ?? [])
      .filter((r) => typeof r.legacy_mongo_id === 'string' && typeof r.slug === 'string')
      .map((r) => [r.legacy_mongo_id as string, r.slug as string])
  )

  const { data: existingRows, error: existingErr } = await db
    .from('articles')
    .select('legacy_mongo_id')
    .not('legacy_mongo_id', 'is', null)
  if (existingErr) throw new Error(`Failed to fetch existing article legacy IDs: ${existingErr.message}`)
  const existingLegacyIds = new Set<string>(
    (existingRows ?? [])
      .map((r) => r.legacy_mongo_id as string | null)
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
  )

  console.log(`Loaded ${tagSlugToId.size} tags (${mongoTagIdToSlug.size} with legacy IDs) from Postgres`)
  console.log(`Loaded ${existingLegacyIds.size} existing article legacy IDs from Postgres\n`)

  const query = MongoArticle.find({}).sort({ publishedAt: -1 }).lean()
  if (LIMIT) query.limit(LIMIT)
  const mongoArticles = await query

  console.log(`Found ${mongoArticles.length} articles in Mongo`)

  let inserted = 0
  let skipped = 0
  let errors = 0
  let publishedFallbacks = 0

  for (const doc of mongoArticles) {
    const legacyMongoId = String(doc._id)
    if (!isDryRun && existingLegacyIds.has(legacyMongoId)) {
      skipped++
      continue
    }

    const title = (doc.title as string)?.trim()
    if (!title) {
      console.warn(`  ⚠ Skipping article with no title: ${doc._id}`)
      skipped++
      continue
    }

    const status = mapStatus(doc)
    const content_stream = mapContentStream(doc.contentStream as string)
    const created_at = objectIdToDate(doc._id as mongoose.Types.ObjectId)
    const published_at = doc.publishedAt
      ? new Date(doc.publishedAt as Date).toISOString()
      : status === 'published'
        ? created_at
        : null

    if (status === 'published' && !doc.publishedAt) {
      publishedFallbacks++
    }

    // Resolve tags from either embedded tags[] or referenced tagIds[]
    const tag_slugs: string[] = resolveTagSlugs(doc, mongoTagIdToSlug)

    // source_url: prefer sourceUrl, fall back to first externalLink
    const source_url =
      ((doc.sourceUrl as string) ?? '').trim() ||
      firstExternalLinkUrl(doc.externalLinks) ||
      null

    const { hero_thumb_url, hero_alt_text, hero_media_kind, hero_video_id, mediaRow } =
      deriveMedia(pickPrimaryMedia(doc))

    const id = crypto.randomUUID()
    const slug = generateArticleSlug(title, id)
    const media_id = mediaRow ? crypto.randomUUID() : null

    if (isDryRun) {
      console.log(
        `  [dry] ${status.toUpperCase()} | ${content_stream} | media=${mediaRow?.kind ?? 'none'} | tags=${tag_slugs.length} | ${title.slice(0, 55)}`
      )
      inserted++
      continue
    }

    // Insert article (hero_media_id set upfront — no FK constraint on column)
    const { error: articleErr } = await db.from('articles').insert({
      id,
      slug,
      title,
      excerpt: ((doc.excerpt as string) ?? '').trim() || null,
      content_markdown: ((doc.content as string) ?? '').trim() || null,
      content_stream,
      status,
      published_at,
      created_at,
      source_url,
      hero_thumb_url,
      hero_alt_text,
      hero_media_kind,
      hero_video_id,
      hero_media_id: media_id,
      tag_slugs,
      legacy_mongo_id: legacyMongoId,
    })

    if (articleErr) {
      console.error(`  ✗ Article failed: ${title.slice(0, 55)} — ${articleErr.message}`)
      errors++
      continue
    }

    // Insert article_media row
    if (mediaRow && media_id) {
      const { error: mediaErr } = await db.from('article_media').insert({
        id: media_id,
        article_id: id,
        kind: mediaRow.kind,
        url: mediaRow.url,
        video_id: mediaRow.video_id,
        sort_order: 0,
        origin: 'manual',
      })
      if (mediaErr) {
        console.warn(`  ⚠ article_media insert failed for ${title.slice(0, 40)}: ${mediaErr.message}`)
      }
    }

    // Insert article_tags join rows
    for (const tagSlug of tag_slugs) {
      const tagId = tagSlugToId.get(tagSlug)
      if (!tagId) {
        console.warn(`  ⚠ Tag not in Postgres: ${tagSlug} (article: ${title.slice(0, 40)})`)
        continue
      }
      const { error: tagErr } = await db.from('article_tags').insert({ article_id: id, tag_id: tagId })
      if (tagErr && !tagErr.message.includes('duplicate')) {
        console.warn(`  ⚠ article_tags insert failed (${tagSlug}): ${tagErr.message}`)
      }
    }

    console.log(`  ✓ [${content_stream}] ${title.slice(0, 60)}`)
    inserted++
    if (!isDryRun) existingLegacyIds.add(legacyMongoId)
  }

  if (publishedFallbacks > 0) {
    console.log(`\nℹ Applied published_at fallback to created_at for ${publishedFallbacks} published articles`)
  }
  console.log(`\nDone. inserted=${inserted} skipped=${skipped} errors=${errors}`)
  await disconnectMongo()
}

main().catch((e) => { console.error(e); process.exit(1) })
