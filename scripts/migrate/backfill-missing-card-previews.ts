/**
 * Fix published articles that show "No preview" on feed cards (non-YouTube focus).
 *
 * 1. Postgres: copy hero from first article_media row when hero_thumb_url is null.
 * 2. Mongo: re-resolve legacy media for rows with legacy_mongo_id still missing heroes.
 *
 *   npm run backfill:missing-previews -- --dry-run
 *   npm run backfill:missing-previews
 */

import crypto from 'crypto'
import mongoose, { Types } from 'mongoose'
import { connectMongo, disconnectMongo } from './mongo-client'
import { db } from './supabase-client'
import {
  heroFieldsFromCardRow,
  needsLegacyMediaRectification,
  resolveLegacyMedia,
  type LegacyMongoArticle,
} from './legacy-article-media'
import {
  extractYouTubeVideoId,
  isCanonicalYouTubeVideoId,
} from '../../lib/ui/youtube-video-id'
import { youTubePosterHqUrl } from '../../lib/ui/excerpt-card'
import { isImageUrl } from '../../lib/ui/is-image-url'
import { parseOgImageFromHtml } from '../../lib/admin/parse-og-tags'

const isDryRun = process.argv.includes('--dry-run')

async function fetchOgImage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'NuggetsPreviewBackfill/1.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return null
    const html = await res.text()
    return parseOgImageFromHtml(html, pageUrl)
  } catch {
    return null
  }
}

function firstImageFromMarkdown(md: string | null | undefined): string | null {
  if (!md?.trim()) return null
  const markdownImg = md.match(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/i)
  if (markdownImg?.[1] && isImageUrl(markdownImg[1])) return markdownImg[1].trim()
  const htmlImg = md.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i)
  if (htmlImg?.[1] && isImageUrl(htmlImg[1])) return htmlImg[1].trim()
  return null
}

type PgRow = {
  id: string
  title: string
  legacy_mongo_id: string | null
  source_url: string | null
  hero_thumb_url: string | null
  hero_media_kind: string | null
  hero_video_id: string | null
  hero_media_id: string | null
  content_stream?: string
}

async function loadMissingHeroPublished(): Promise<PgRow[]> {
  const { data, error } = await db
    .from('articles')
    .select(
      'id, title, legacy_mongo_id, source_url, hero_thumb_url, hero_media_kind, hero_video_id, hero_media_id, content_stream'
    )
    .eq('status', 'published')
    .is('hero_thumb_url', null)

  if (error) throw new Error(error.message)
  return ((data ?? []) as PgRow[]).filter((row) => row.hero_media_kind !== 'youtube')
}

async function backfillYoutubeFromSource(rows: PgRow[]): Promise<number> {
  let fixed = 0
  for (const row of rows) {
    const videoId = extractYouTubeVideoId(row.source_url)
    if (!videoId || !isCanonicalYouTubeVideoId(videoId)) continue

    const hero_thumb_url = youTubePosterHqUrl(videoId)
    if (isDryRun) {
      console.log(`  [dry-run youtube] ${row.title.slice(0, 55)} → ${videoId}`)
      fixed++
      continue
    }

    const { error } = await db
      .from('articles')
      .update({
        hero_video_id: videoId,
        hero_media_kind: 'youtube',
        hero_thumb_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    if (error) {
      console.error(`  ✗ youtube ${row.id}: ${error.message}`)
      continue
    }
    console.log(`  ✓ youtube ${row.title.slice(0, 60)}`)
    fixed++
  }
  return fixed
}

async function backfillFromMarkdown(rows: PgRow[]): Promise<number> {
  let fixed = 0
  for (const row of rows) {
    const { data, error } = await db
      .from('articles')
      .select('content_markdown')
      .eq('id', row.id)
      .maybeSingle()

    if (error || !data?.content_markdown) continue
    const url = firstImageFromMarkdown(data.content_markdown as string)
    if (!url) continue

    if (isDryRun) {
      console.log(`  [dry-run markdown] ${row.title.slice(0, 55)} → ${url.slice(0, 72)}`)
      fixed++
      continue
    }

    const { error: updateError } = await db
      .from('articles')
      .update({
        hero_thumb_url: url,
        hero_media_kind: 'image',
        hero_video_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    if (updateError) {
      console.error(`  ✗ markdown ${row.id}: ${updateError.message}`)
      continue
    }
    console.log(`  ✓ markdown ${row.title.slice(0, 60)}`)
    fixed++
  }
  return fixed
}

async function loadSampleHeroForStream(stream: string): Promise<string | null> {
  const { data } = await db
    .from('articles')
    .select('id, hero_thumb_url')
    .eq('status', 'published')
    .eq('content_stream', stream)
    .not('hero_thumb_url', 'is', null)
    .limit(40)

  const row = (data ?? []).find(
    (r) =>
      !String(r.id).startsWith('a1000000') &&
      Boolean((r.hero_thumb_url as string | null)?.trim())
  )
  return (row?.hero_thumb_url as string | null)?.trim() || null
}

async function backfillFromSourceOg(rows: PgRow[]): Promise<number> {
  let fixed = 0
  for (const row of rows) {
    const source = row.source_url?.trim()
    if (!source) continue
    if (extractYouTubeVideoId(source)) continue

    const ogUrl = await fetchOgImage(source)
    if (!ogUrl) continue

    if (isDryRun) {
      console.log(`  [dry-run og] ${row.title.slice(0, 55)} → ${ogUrl.slice(0, 72)}`)
      fixed++
      continue
    }

    const { error } = await db
      .from('articles')
      .update({
        hero_thumb_url: ogUrl,
        hero_media_kind: 'image',
        hero_video_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    if (error) {
      console.error(`  ✗ og ${row.id}: ${error.message}`)
      continue
    }
    console.log(`  ✓ og ${row.title.slice(0, 60)}`)
    fixed++
  }
  return fixed
}

async function backfillSeedPlaceholders(rows: PgRow[]): Promise<number> {
  let fixed = 0
  const sampleByStream = new Map<string, string | null>()

  for (const row of rows) {
    if (!String(row.id).startsWith('a1000000')) continue

    const stream = row.content_stream ?? 'standard'
    if (!sampleByStream.has(stream)) {
      sampleByStream.set(stream, await loadSampleHeroForStream(stream))
    }
    const hero_thumb_url = sampleByStream.get(stream)
    if (!hero_thumb_url) {
      console.warn(`  ⚠ No sample hero for stream=${stream}; skip seed ${row.title}`)
      continue
    }

    if (isDryRun) {
      console.log(`  [dry-run seed] ${row.title} → ${hero_thumb_url.slice(0, 72)}`)
      fixed++
      continue
    }

    const { error } = await db
      .from('articles')
      .update({
        hero_thumb_url,
        hero_media_kind: 'image',
        hero_video_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    if (error) {
      console.error(`  ✗ seed ${row.id}: ${error.message}`)
      continue
    }
    console.log(`  ✓ seed ${row.title}`)
    fixed++
  }
  return fixed
}

async function backfillFromArticleMedia(rows: PgRow[]): Promise<number> {
  let fixed = 0
  for (const row of rows) {
    const { data: media, error } = await db
      .from('article_media')
      .select('id, url, kind, video_id, hero_thumb_url, sort_order')
      .eq('article_id', row.id)
      .order('sort_order', { ascending: true })
      .limit(1)

    if (error || !media?.length) continue

    const first = media[0]
    const hero_thumb_url =
      first.hero_thumb_url?.trim() || first.url?.trim() || null
    if (!hero_thumb_url) continue

    const hero_media_kind =
      first.kind === 'youtube' ? ('youtube' as const) : ('image' as const)
    const hero_video_id = first.video_id ?? null

    if (isDryRun) {
      console.log(`  [dry-run media] ${row.title.slice(0, 60)} → ${hero_thumb_url.slice(0, 72)}`)
      fixed++
      continue
    }

    const { error: updateError } = await db
      .from('articles')
      .update({
        hero_thumb_url,
        hero_media_kind,
        hero_video_id,
        hero_media_id: first.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    if (updateError) {
      console.error(`  ✗ ${row.title.slice(0, 40)}: ${updateError.message}`)
      continue
    }
    console.log(`  ✓ media hero ${row.title.slice(0, 60)}`)
    fixed++
  }
  return fixed
}

async function backfillFromMongo(rows: PgRow[]): Promise<{
  updated: number
  skipped: number
  missingMongo: number
}> {
  const targets = rows.filter((r) => r.legacy_mongo_id)
  if (targets.length === 0) return { updated: 0, skipped: 0, missingMongo: 0 }

  await connectMongo()

  const legacyIds = targets
    .map((r) => r.legacy_mongo_id!)
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id))

  const mongoDocs = await mongoose.connection.db!
    .collection<LegacyMongoArticle>('articles')
    .find({ _id: { $in: legacyIds } })
    .toArray()

  const mongoByLegacy = new Map(mongoDocs.map((doc) => [String(doc._id), doc]))

  let updated = 0
  let skipped = 0
  let missingMongo = 0

  for (const row of targets) {
    const doc = mongoByLegacy.get(row.legacy_mongo_id!)
    if (!doc) {
      missingMongo++
      continue
    }

    const resolved = resolveLegacyMedia(doc)
    if (resolved.cardMedia.length === 0) {
      skipped++
      continue
    }

    if (
      !needsLegacyMediaRectification(
        { hero_thumb_url: row.hero_thumb_url, hero_media_kind: row.hero_media_kind },
        resolved
      )
    ) {
      skipped++
      continue
    }

    const heroRow = resolved.cardMedia[resolved.heroIndex]
    if (!heroRow) {
      skipped++
      continue
    }

    const heroFields = heroFieldsFromCardRow(heroRow)

    if (isDryRun) {
      console.log(
        `  [dry-run mongo] ${row.title.slice(0, 55)} → ${heroFields.hero_thumb_url.slice(0, 72)}`
      )
      updated++
      continue
    }

    const { error: deleteError } = await db
      .from('article_media')
      .delete()
      .eq('article_id', row.id)
      .eq('origin', 'manual')

    if (deleteError) {
      console.error(`  ✗ delete media ${row.id}: ${deleteError.message}`)
      continue
    }

    const mediaInserts = resolved.cardMedia.map((media) => ({
      id: crypto.randomUUID(),
      article_id: row.id,
      kind: media.kind,
      url: media.url,
      video_id: media.video_id,
      sort_order: media.sort_order,
      origin: 'manual' as const,
      hero_thumb_url: media.hero_thumb_url,
    }))

    const { data: insertedMedia, error: insertError } = await db
      .from('article_media')
      .insert(mediaInserts)
      .select('id, url, sort_order')

    if (insertError) {
      console.error(`  ✗ insert media ${row.id}: ${insertError.message}`)
      continue
    }

    const heroMedia =
      (insertedMedia ?? []).find((m) => m.url === heroRow.url) ??
      (insertedMedia ?? []).sort((a, b) => a.sort_order - b.sort_order)[0]

    const { error: updateError } = await db
      .from('articles')
      .update({
        source_url: resolved.source_url,
        hero_thumb_url: heroFields.hero_thumb_url,
        hero_media_kind: heroFields.hero_media_kind,
        hero_video_id: heroFields.hero_video_id,
        hero_media_id: heroMedia?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    if (updateError) {
      console.error(`  ✗ update article ${row.id}: ${updateError.message}`)
      continue
    }

    console.log(`  ✓ mongo ${row.title.slice(0, 70)}`)
    updated++
  }

  await disconnectMongo()
  return { updated, skipped, missingMongo }
}

async function main() {
  console.log(`Backfill missing card previews${isDryRun ? ' (DRY RUN)' : ''}\n`)

  let rows = await loadMissingHeroPublished()
  console.log(`Published with null hero_thumb (non-youtube): ${rows.length}`)

  const fromYoutube = await backfillYoutubeFromSource(rows)
  console.log(`\nStep 1 — YouTube poster from source_url: ${fromYoutube} fixed`)

  rows = await loadMissingHeroPublished()
  const fromMedia = await backfillFromArticleMedia(rows)
  console.log(`\nStep 2 — hero from article_media: ${fromMedia} fixed`)

  rows = await loadMissingHeroPublished()
  const fromMarkdown = await backfillFromMarkdown(rows)
  console.log(`\nStep 3 — first image from content_markdown: ${fromMarkdown} fixed`)

  rows = await loadMissingHeroPublished()
  console.log(`\nRemaining null hero: ${rows.length}`)

  const mongo = await backfillFromMongo(rows)
  console.log('\nStep 4 — legacy Mongo media:')
  console.log(`  updated: ${mongo.updated}`)
  console.log(`  skipped (no card media / already ok): ${mongo.skipped}`)
  console.log(`  missing Mongo doc: ${mongo.missingMongo}`)

  rows = await loadMissingHeroPublished()
  const fromSeed = await backfillSeedPlaceholders(rows)
  console.log(`\nStep 5 — demo seed placeholders: ${fromSeed} fixed`)

  rows = await loadMissingHeroPublished()
  const fromOg = await backfillFromSourceOg(rows)
  console.log(`\nStep 6 — og:image from source_url: ${fromOg} fixed`)

  rows = await loadMissingHeroPublished()
  const seed = rows.filter((r) => String(r.id).startsWith('a1000000'))
  console.log(`\nStill null hero: ${rows.length} (seed/demo ids: ${seed.length})`)

  if (isDryRun) console.log('\nRe-run without --dry-run to apply.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
