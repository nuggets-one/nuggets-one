// scripts/migrate/backfill-media-tags.ts
// Backfills hero media + tags for already-migrated articles by legacy_mongo_id.
// Run: npm exec tsx scripts/migrate/backfill-media-tags.ts [--dry-run] [--limit=100|--limit 100]

import crypto from 'crypto'
import mongoose, { Types } from 'mongoose'
import { connectMongo, disconnectMongo } from './mongo-client'
import { db } from './supabase-client'

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

type ArticleNeedRow = {
  id: string
  legacy_mongo_id: string
  hero_thumb_url: string | null
  tag_slugs: string[] | null
}

type TagRow = {
  id: string
  slug: string
  legacy_mongo_id: string | null
}

type MongoArticle = {
  _id: Types.ObjectId
  sourceUrl?: string
  externalLinks?: unknown
  media?: unknown
  primaryMedia?: unknown
  heroImage?: unknown
  hero_image?: unknown
  thumbnail?: unknown
  coverImage?: unknown
  image?: unknown
  tags?: unknown
  tagIds?: unknown
}

function normalizeSlug(raw: string | null | undefined): string | null {
  const slug = (raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || null
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

/** Legacy externalLinks may be string[] or { url }[] (or mixed). */
function firstExternalLinkUrl(links: unknown): string | null {
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

function pickPrimaryMedia(doc: MongoArticle): { url: string; alt?: string; type?: string; videoId?: string; thumbnail_url?: string } | null {
  const candidate = doc.primaryMedia
  if (candidate && typeof candidate === 'object') {
    const c = candidate as Record<string, unknown>
    const url = String(c.url ?? c.src ?? c.secure_url ?? '').trim()
    if (url) {
      return {
        url,
        alt: typeof c.alt === 'string' ? c.alt : undefined,
        type: typeof c.type === 'string' ? c.type : undefined,
        videoId: typeof c.videoId === 'string' ? c.videoId : undefined,
        thumbnail_url: typeof c.thumbnail_url === 'string' ? c.thumbnail_url : undefined,
      }
    }
  }

  if (doc.media && typeof doc.media === 'object' && !Array.isArray(doc.media)) {
    const m = doc.media as Record<string, unknown>
    const url = String(m.url ?? m.src ?? m.secure_url ?? '').trim()
    if (url) {
      return {
        url,
        alt: typeof m.alt === 'string' ? m.alt : undefined,
        type: typeof m.type === 'string' ? m.type : undefined,
        videoId: typeof m.videoId === 'string' ? m.videoId : undefined,
        thumbnail_url: typeof m.thumbnail_url === 'string' ? m.thumbnail_url : undefined,
      }
    }
  }

  if (Array.isArray(doc.media)) {
    for (const raw of doc.media) {
      if (!raw || typeof raw !== 'object') continue
      const m = raw as Record<string, unknown>
      const url = String(m.url ?? m.src ?? m.secure_url ?? '').trim()
      if (!url) continue
      const kind = String(m.type ?? m.kind ?? m.mediaType ?? '').toLowerCase()
      const videoId = typeof m.videoId === 'string' ? m.videoId : undefined
      return {
        url,
        alt: typeof m.alt === 'string' ? m.alt : undefined,
        type: kind.includes('video') || videoId ? 'video' : 'image',
        videoId,
        thumbnail_url: typeof m.thumbnail_url === 'string' ? m.thumbnail_url : undefined,
      }
    }
  }

  for (const key of ['heroImage', 'hero_image', 'thumbnail', 'coverImage', 'image'] as const) {
    const raw = doc[key]
    if (typeof raw === 'string' && raw.trim()) {
      return { url: raw.trim(), type: 'image' }
    }
    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>
      const url = String(obj.url ?? obj.src ?? obj.secure_url ?? '').trim()
      if (url) return { url, alt: typeof obj.alt === 'string' ? obj.alt : undefined, type: 'image' }
    }
  }

  return null
}

function deriveMedia(primaryMedia: ReturnType<typeof pickPrimaryMedia>): {
  hero_thumb_url: string | null
  hero_media_kind: 'image' | 'youtube' | null
  hero_video_id: string | null
  mediaRow: { url: string; kind: 'image' | 'youtube'; video_id: string | null; hero_thumb_url: string | null } | null
} {
  if (!primaryMedia?.url) {
    return { hero_thumb_url: null, hero_media_kind: null, hero_video_id: null, mediaRow: null }
  }

  const typeRaw = String(primaryMedia.type ?? '').toLowerCase()
  const isYoutube = typeRaw.includes('youtube')
  const isVideo = typeRaw.includes('video') || isYoutube
  const inferredVideoId = typeof primaryMedia.videoId === 'string'
    ? primaryMedia.videoId
    : extractYouTubeVideoId(primaryMedia.url)

  if (isVideo && inferredVideoId) {
    const thumb = primaryMedia.thumbnail_url ?? `https://i.ytimg.com/vi/${inferredVideoId}/hqdefault.jpg`
    return {
      hero_thumb_url: thumb,
      hero_media_kind: 'youtube',
      hero_video_id: inferredVideoId,
      mediaRow: { url: primaryMedia.url, kind: 'youtube', video_id: inferredVideoId, hero_thumb_url: thumb },
    }
  }

  return {
    hero_thumb_url: primaryMedia.url,
    hero_media_kind: 'image',
    hero_video_id: null,
    mediaRow: { url: primaryMedia.url, kind: 'image', video_id: null, hero_thumb_url: primaryMedia.url },
  }
}

function resolveTagSlugs(doc: MongoArticle, mongoTagIdToSlug: Map<string, string>): string[] {
  const out = new Set<string>()

  if (Array.isArray(doc.tags)) {
    for (const t of doc.tags) {
      if (typeof t === 'string') {
        const s = normalizeSlug(t)
        if (s) out.add(s)
        continue
      }
      if (t && typeof t === 'object') {
        const obj = t as { slug?: string; label?: string; name?: string }
        const s = normalizeSlug(obj.slug ?? obj.label ?? obj.name)
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

  return [...out].sort()
}

async function main() {
  console.log(`\n🛠 Backfill media + tags ${isDryRun ? '[DRY RUN]' : '[LIVE]'}${LIMIT ? ` [LIMIT ${LIMIT}]` : ''}\n`)

  const { data: allRows, error: allRowsErr } = await db
    .from('articles')
    .select('id, legacy_mongo_id, hero_thumb_url, tag_slugs')
    .not('legacy_mongo_id', 'is', null)
  if (allRowsErr) throw new Error(`Failed to load candidate articles: ${allRowsErr.message}`)

  const candidates: ArticleNeedRow[] = (allRows ?? [])
    .map((r) => ({
      id: r.id as string,
      legacy_mongo_id: r.legacy_mongo_id as string,
      hero_thumb_url: (r.hero_thumb_url as string | null) ?? null,
      tag_slugs: (r.tag_slugs as string[] | null) ?? [],
    }))
    .filter((r) => !r.hero_thumb_url || (Array.isArray(r.tag_slugs) && r.tag_slugs.length === 0))

  const limited = LIMIT ? candidates.slice(0, LIMIT) : candidates
  const legacyIds = limited.map((r) => r.legacy_mongo_id)
  console.log(`Step 1: found ${candidates.length} articles needing backfill${LIMIT ? `; processing ${limited.length}` : ''}`)

  if (legacyIds.length === 0) {
    console.log('Nothing to backfill.')
    return
  }

  await connectMongo()

  const objectIds = legacyIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id))

  const mongoDocs = await mongoose.connection.db
    .collection<MongoArticle>('articles')
    .find({ _id: { $in: objectIds } })
    .toArray()

  const mongoById = new Map<string, MongoArticle>(
    mongoDocs.map((doc) => [String(doc._id), doc])
  )
  console.log(`Step 2: loaded ${mongoDocs.length} matching Mongo docs`)

  const { data: tagRows, error: tagErr } = await db
    .from('tags')
    .select('id, slug, legacy_mongo_id')
    .not('legacy_mongo_id', 'is', null)
  if (tagErr) throw new Error(`Failed to load tags: ${tagErr.message}`)

  const tags = (tagRows ?? []) as unknown as TagRow[]
  const mongoTagIdToSlug = new Map<string, string>(tags.map((t) => [String(t.legacy_mongo_id), t.slug]))
  const slugToTagId = new Map<string, string>(tags.map((t) => [t.slug, t.id]))

  let heroUpdated = 0
  let tagsUpdated = 0
  let skippedAlreadySet = 0
  let errors = 0

  const rowByLegacy = new Map<string, ArticleNeedRow>(limited.map((r) => [r.legacy_mongo_id, r]))

  for (const legacyId of legacyIds) {
    const row = rowByLegacy.get(legacyId)
    if (!row) continue

    const doc = mongoById.get(legacyId)
    if (!doc) {
      console.warn(`[${legacyId}] no matching Mongo document`)
      skippedAlreadySet++
      continue
    }

    const sourceUrlResolved =
      ((doc.sourceUrl as string | undefined) ?? '').trim() || firstExternalLinkUrl(doc.externalLinks)

    const mediaResolved = deriveMedia(pickPrimaryMedia(doc))
    const tagSlugs = resolveTagSlugs(doc, mongoTagIdToSlug)
    const resolvedTagIds = tagSlugs
      .map((slug) => slugToTagId.get(slug))
      .filter((v): v is string => typeof v === 'string')

    try {
      let heroKind: 'youtube' | 'image' | 'none' = 'none'
      let didHero = false
      let didTags = false

      if (mediaResolved.mediaRow && !row.hero_thumb_url) {
        heroKind = mediaResolved.hero_media_kind ?? 'none'
        if (!isDryRun) {
          const mediaId = crypto.randomUUID()

          const existingMedia = await db
            .from('article_media')
            .select('id')
            .eq('article_id', row.id)
            .order('sort_order', { ascending: true })
            .limit(1)
            .maybeSingle()

          const mediaIdToUse = existingMedia.data?.id
            ? (existingMedia.data.id as string)
            : mediaId

          if (!existingMedia.data?.id) {
            const mediaInsert = await db.from('article_media').upsert(
              {
                id: mediaIdToUse,
                article_id: row.id,
                kind: mediaResolved.mediaRow.kind,
                url: mediaResolved.mediaRow.url,
                video_id: mediaResolved.mediaRow.video_id,
                sort_order: 0,
                origin: 'manual',
                hero_thumb_url: mediaResolved.mediaRow.hero_thumb_url,
              },
              { onConflict: 'id', ignoreDuplicates: true }
            )
            if (mediaInsert.error) throw mediaInsert.error
          }

          const updateHero = await db
            .from('articles')
            .update({
              hero_thumb_url: mediaResolved.hero_thumb_url,
              hero_media_kind: mediaResolved.hero_media_kind,
              hero_video_id: mediaResolved.hero_video_id,
              hero_media_id: mediaIdToUse,
              source_url: sourceUrlResolved ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('legacy_mongo_id', legacyId)
            .is('hero_thumb_url', null)
          if (updateHero.error) throw updateHero.error
        }
        didHero = true
        heroUpdated++
      }

      if (resolvedTagIds.length > 0 && (!Array.isArray(row.tag_slugs) || row.tag_slugs.length === 0)) {
        if (!isDryRun) {
          const tagPairs = resolvedTagIds.map((tagId) => ({ article_id: row.id, tag_id: tagId }))
          const upsertTags = await db.from('article_tags').upsert(tagPairs, {
            onConflict: 'article_id,tag_id',
            ignoreDuplicates: true,
          })
          if (upsertTags.error) throw upsertTags.error

          const updateTags = await db
            .from('articles')
            .update({
              tag_slugs: tagSlugs,
              updated_at: new Date().toISOString(),
            })
            .eq('legacy_mongo_id', legacyId)
            .filter('cardinality(tag_slugs)', 'eq', '0')
          if (updateTags.error) {
            // PostgREST cannot always express cardinality(); fallback by id.
            const fallback = await db
              .from('articles')
              .update({
                tag_slugs: tagSlugs,
                updated_at: new Date().toISOString(),
              })
              .eq('id', row.id)
            if (fallback.error) throw fallback.error
          }
        }
        didTags = true
        tagsUpdated++
      }

      if (!didHero && !didTags) skippedAlreadySet++
      console.log(`[${legacyId}] hero: ${heroKind} | tags: ${resolvedTagIds.length} resolved / ${Array.isArray(doc.tagIds) ? doc.tagIds.length : 0} total`)
    } catch (e) {
      errors++
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[${legacyId}] error: ${msg}`)
    }
  }

  console.log('\nSummary:')
  console.log(`hero_updated: ${heroUpdated}`)
  console.log(`tags_updated: ${tagsUpdated}`)
  console.log(`skipped_already_set: ${skippedAlreadySet}`)
  console.log(`errors: ${errors}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    try {
      await disconnectMongo()
    } catch {
      // no-op
    }
  })
