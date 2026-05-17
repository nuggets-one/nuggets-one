// scripts/migrate/migrate-articles.ts
// Migrates legacy Mongo articles → Postgres articles table
// Run: npm run etl:articles [--dry-run] [--limit=100|--limit N]
//
// Field mapping (Migration Plan §3.2):
//   isPublished (bool, ~98% presence) → status='published'|'draft'
//   status (string, ~2% presence) → wins over isPublished if present
//   contentStream 'both'|null|missing → 'standard'; 'pulse' → 'pulse'
//   content → content_markdown
//   sourceUrl / externalLinks → source_url (attribution — may be PDF)
//   created_at derived from ObjectId timestamp (no createdAt field in docs)
//   primaryMedia + supportingMedia + media + images + displayImageIndex → article_media + hero_*
//   (see legacy-article-media.ts — PDFs are never card heroes)
//   hero_media_id → article_media.id for chosen hero row
//   tags/tagIds (legacy shape variants) → article_tags join rows + tag_slugs[]

import { connectMongo, disconnectMongo } from './mongo-client'
import { db } from './supabase-client'
import {
  firstExternalLinkUrl,
  heroFieldsFromCardRow,
  resolveLegacyMedia,
  type LegacyMongoArticle,
} from './legacy-article-media'
import { generateArticleSlug } from '../shared/slug'
import { resolveCardPreview } from '../shared/article-preview'
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

type LegacyArticleDoc = LegacyMongoArticle & {
  _id: mongoose.Types.ObjectId
  title?: string
  excerpt?: string
  content?: string
  contentStream?: string
  status?: string
  isPublished?: boolean
  publishedAt?: Date | string | null
  visibility?: string
  tags?: unknown
  tagIds?: unknown
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

// Derive created_at from ObjectId timestamp (Migration Plan §3.2: no createdAt field on docs)
function objectIdToDate(id: mongoose.Types.ObjectId): string {
  return new Date(parseInt(id.toString().slice(0, 8), 16) * 1000).toISOString()
}

function resolveTagSlugs(doc: LegacyArticleDoc, mongoTagIdToSlug: Map<string, string>): string[] {
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

function resolveTitle(doc: LegacyArticleDoc): string {
  const direct = String(doc.title ?? '').trim()
  if (direct) return direct

  const mediaObj = (doc.media ?? null) as { previewMetadata?: { title?: unknown } } | null
  const mediaPreviewTitle = String(mediaObj?.previewMetadata?.title ?? '').trim()
  if (mediaPreviewTitle) return mediaPreviewTitle

  const primaryMediaObj = (doc.primaryMedia ?? null) as { previewMetadata?: { title?: unknown } } | null
  const primaryPreviewTitle = String(primaryMediaObj?.previewMetadata?.title ?? '').trim()
  if (primaryPreviewTitle) return primaryPreviewTitle

  const source = String(doc.sourceUrl ?? firstExternalLinkUrl(doc.externalLinks) ?? '').trim()
  if (source) return source

  return `Untitled ${String(doc._id).slice(-6)}`
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

  const existingLegacyIds = new Set<string>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const { data: existingRows, error: existingErr } = await db
      .from('articles')
      .select('legacy_mongo_id')
      .not('legacy_mongo_id', 'is', null)
      .range(from, to)
    if (existingErr) throw new Error(`Failed to fetch existing article legacy IDs: ${existingErr.message}`)
    const rows = existingRows ?? []
    for (const r of rows) {
      const id = r.legacy_mongo_id as string | null
      if (typeof id === 'string' && id.length > 0) existingLegacyIds.add(id)
    }
    if (rows.length < pageSize) break
  }

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

  for (const doc of mongoArticles as LegacyArticleDoc[]) {
    const legacyMongoId = String(doc._id)
    if (!isDryRun && existingLegacyIds.has(legacyMongoId)) {
      skipped++
      continue
    }

    const title = resolveTitle(doc)

    // Legacy data uses publishedAt as the canonical publish signal.
    // isPublished is absent on all documents in this dataset.
    // status field exists on ~2% of documents only.
    // Rule: any doc with publishedAt set is published.
    const isPublished =
      doc.publishedAt != null ||
      doc.status === 'published' ||
      doc.isPublished === true

    const status: 'published' | 'draft' =
      doc.visibility === 'private' ? 'draft' : (isPublished ? 'published' : 'draft')
    const content_stream = mapContentStream(doc.contentStream as string)
    const created_at = objectIdToDate(doc._id as mongoose.Types.ObjectId)
    const published_at = isPublished
      ? (doc.publishedAt
          ? new Date(doc.publishedAt as Date).toISOString()
          : created_at)
      : null

    if (status === 'published' && !doc.publishedAt) {
      publishedFallbacks++
    }

    // Resolve tags from either embedded tags[] or referenced tagIds[]
    const tag_slugs: string[] = resolveTagSlugs(doc, mongoTagIdToSlug)

    const legacyMedia = resolveLegacyMedia(doc)
    const source_url = legacyMedia.source_url
    const heroRow =
      legacyMedia.heroIndex >= 0 ? legacyMedia.cardMedia[legacyMedia.heroIndex] : null
    const heroFields = heroRow ? heroFieldsFromCardRow(heroRow) : null
    const excerpt = ((doc.excerpt as string) ?? '').trim() || null
    const content_markdown = ((doc.content as string) ?? '').trim() || null
    const card_preview = resolveCardPreview({ content_markdown, excerpt })

    const id = crypto.randomUUID()
    const slug = generateArticleSlug(title, id)
    if (isDryRun) {
      console.log(
        `  [dry] ${status.toUpperCase()} | ${content_stream} | media=${legacyMedia.cardMedia.length} | tags=${tag_slugs.length} | ${title.slice(0, 55)}`
      )
      inserted++
      continue
    }

    // Insert article (hero_media_id set upfront — no FK constraint on column)
    const { error: articleErr } = await db.from('articles').insert({
      id,
      slug,
      title,
      excerpt,
      card_preview,
      content_markdown,
      content_stream,
      status,
      published_at,
      created_at,
      source_url,
      hero_thumb_url: heroFields?.hero_thumb_url ?? null,
      hero_alt_text: null,
      hero_media_kind: heroFields?.hero_media_kind ?? null,
      hero_video_id: heroFields?.hero_video_id ?? null,
      hero_media_id: null,
      tag_slugs,
      legacy_mongo_id: legacyMongoId,
    })

    if (articleErr) {
      console.error(`  ✗ Article failed: ${title.slice(0, 55)} — ${articleErr.message}`)
      errors++
      continue
    }

    if (legacyMedia.cardMedia.length > 0) {
      const mediaInserts = legacyMedia.cardMedia.map((media) => ({
        id: crypto.randomUUID(),
        article_id: id,
        kind: media.kind,
        url: media.url,
        video_id: media.video_id,
        sort_order: media.sort_order,
        origin: 'manual' as const,
        hero_thumb_url: media.hero_thumb_url,
      }))

      const { data: insertedMedia, error: mediaErr } = await db
        .from('article_media')
        .insert(mediaInserts)
        .select('id, url')

      if (mediaErr) {
        console.warn(`  ⚠ article_media insert failed for ${title.slice(0, 40)}: ${mediaErr.message}`)
      } else if (heroRow) {
        const heroMedia =
          (insertedMedia ?? []).find((m) => m.url === heroRow.url) ?? insertedMedia?.[0]
        if (heroMedia?.id) {
          const { error: heroRefErr } = await db
            .from('articles')
            .update({ hero_media_id: heroMedia.id as string })
            .eq('id', id)
          if (heroRefErr) {
            console.warn(`  ⚠ hero_media_id update failed for ${title.slice(0, 40)}: ${heroRefErr.message}`)
          }
        }
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
