// scripts/migrate/backfill-legacy-media-heroes.ts
//
// Rectifies hero_thumb_url + article_media for migrated articles by re-reading
// legacy Mongo media fields (primaryMedia, supportingMedia, displayImageIndex, …).
//
// Run from repo root:
//   npm run backfill:legacy-media -- --dry-run
//   npm run backfill:legacy-media -- --limit=50
//   npm run backfill:legacy-media -- --all
//   npm run backfill:legacy-media -- --article-id=<uuid>
//
// Requires: MONGODB_URI, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import crypto from 'crypto'
import mongoose, { Types } from 'mongoose'
import { connectMongo, disconnectMongo } from './mongo-client'
import { db } from './supabase-client'
import {
  heroFieldsFromCardRow,
  needsLegacyGallerySync,
  needsLegacyMediaRectification,
  resolveLegacyMedia,
  type LegacyMongoArticle,
} from './legacy-article-media'
import { isPdfUrl } from '../../lib/ui/is-pdf-url'

const isDryRun = process.argv.includes('--dry-run')
const fixAll = process.argv.includes('--all')

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

function parseArticleId(argv: string[]): string | null {
  const eq = argv.find((a) => a.startsWith('--article-id='))
  if (eq) return eq.split('=')[1]?.trim() || null
  const idx = argv.indexOf('--article-id')
  if (idx !== -1) {
    const next = argv[idx + 1]
    if (next && !next.startsWith('-')) return next.trim()
  }
  return null
}

const LIMIT = parseLimitFromArgv(process.argv)
const ARTICLE_ID = parseArticleId(process.argv)

type PgArticleRow = {
  id: string
  title: string
  legacy_mongo_id: string | null
  source_url: string | null
  hero_thumb_url: string | null
  hero_media_kind: string | null
  hero_video_id: string | null
  hero_media_id: string | null
}

async function loadPostgresArticles(): Promise<PgArticleRow[]> {
  if (ARTICLE_ID) {
    const { data, error } = await db
      .from('articles')
      .select(
        'id, title, legacy_mongo_id, source_url, hero_thumb_url, hero_media_kind, hero_video_id, hero_media_id'
      )
      .eq('id', ARTICLE_ID)
    if (error) throw new Error(`Failed to load articles: ${error.message}`)
    return (data ?? []) as PgArticleRow[]
  }

  const rows: PgArticleRow[] = []
  const pageSize = 1000
  let from = 0
  while (true) {
    const { data, error } = await db
      .from('articles')
      .select(
        'id, title, legacy_mongo_id, source_url, hero_thumb_url, hero_media_kind, hero_video_id, hero_media_id'
      )
      .not('legacy_mongo_id', 'is', null)
      .range(from, from + pageSize - 1)

    if (error) throw new Error(`Failed to load articles: ${error.message}`)
    const batch = (data ?? []) as PgArticleRow[]
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }
  return rows
}

async function loadImageMediaCounts(articleIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  for (let i = 0; i < articleIds.length; i += 200) {
    const chunk = articleIds.slice(i, i + 200)
    const { data, error } = await db
      .from('article_media')
      .select('article_id, kind')
      .in('article_id', chunk)
    if (error) throw new Error(`article_media count: ${error.message}`)
    for (const row of data ?? []) {
      if (row.kind !== 'image') continue
      const id = row.article_id as string
      map.set(id, (map.get(id) ?? 0) + 1)
    }
  }
  return map
}

async function applyRectification(
  row: PgArticleRow,
  doc: LegacyMongoArticle,
  storedImageMediaCount: number
): Promise<'updated' | 'skipped' | 'error'> {
  const resolved = resolveLegacyMedia(doc)

  if (resolved.cardMedia.length === 0) {
    return 'skipped'
  }

  const shouldUpdate =
    fixAll ||
    needsLegacyGallerySync(storedImageMediaCount, resolved) ||
    needsLegacyMediaRectification(
      {
        hero_thumb_url: row.hero_thumb_url,
        hero_media_kind: row.hero_media_kind,
      },
      resolved
    )

  if (!shouldUpdate) {
    return 'skipped'
  }

  const heroRow = resolved.cardMedia[resolved.heroIndex]
  if (!heroRow) return 'skipped'

  const heroFields = heroFieldsFromCardRow(heroRow)

  if (isDryRun) {
    console.log(`  [dry-run] ${row.title.slice(0, 55)}`)
    console.log(`    source_url: ${resolved.source_url ?? '(null)'}`)
    console.log(
      `    hero: ${row.hero_thumb_url?.slice(0, 72) ?? '(null)'} → ${heroFields.hero_thumb_url.slice(0, 72)}`
    )
    console.log(
      `    card_media: ${storedImageMediaCount} stored → ${resolved.cardMedia.length} legacy images`
    )
    return 'updated'
  }

  const { error: deleteError } = await db
    .from('article_media')
    .delete()
    .eq('article_id', row.id)
    .eq('origin', 'manual')

  if (deleteError) {
    console.error(`  ✗ delete article_media: ${deleteError.message}`)
    return 'error'
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
    console.error(`  ✗ insert article_media: ${insertError.message}`)
    return 'error'
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
    console.error(`  ✗ update articles: ${updateError.message}`)
    return 'error'
  }

  return 'updated'
}

async function main() {
  console.log(
    `Backfill legacy media heroes${isDryRun ? ' (DRY RUN)' : ''}${fixAll ? ' [ALL]' : ' [needs-fix only]'}`
  )

  const pgRows = await loadPostgresArticles()
  const withLegacy = pgRows.filter((r) => r.legacy_mongo_id)
  const limited = LIMIT ? withLegacy.slice(0, LIMIT) : withLegacy

  console.log(`Postgres articles with legacy_mongo_id: ${withLegacy.length} (processing ${limited.length})`)

  await connectMongo()

  const legacyIds = limited
    .map((r) => r.legacy_mongo_id!)
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id))

  const mongoDocs = await mongoose.connection.db!
    .collection<LegacyMongoArticle>('articles')
    .find({ _id: { $in: legacyIds } })
    .toArray()

  const mongoByLegacy = new Map<string, LegacyMongoArticle>(
    mongoDocs.map((doc) => [String(doc._id), doc])
  )

  const mediaCounts = await loadImageMediaCounts(limited.map((r) => r.id))

  console.log(`Loaded ${mongoDocs.length} Mongo docs\n`)

  let updated = 0
  let skipped = 0
  let missingMongo = 0
  let errors = 0
  let pdfHeroBefore = 0

  for (const row of limited) {
    const legacyId = row.legacy_mongo_id!
    const doc = mongoByLegacy.get(legacyId)

    if (isPdfUrl(row.hero_thumb_url)) pdfHeroBefore++

    if (!doc) {
      console.warn(`  ⚠ No Mongo doc for legacy_mongo_id=${legacyId} (${row.title.slice(0, 40)})`)
      missingMongo++
      continue
    }

    const result = await applyRectification(row, doc, mediaCounts.get(row.id) ?? 0)
    if (result === 'updated') {
      if (!isDryRun) {
        console.log(`  ✓ ${row.title.slice(0, 70)}`)
      }
      updated++
    } else if (result === 'error') {
      errors++
    } else {
      skipped++
    }
  }

  await disconnectMongo()

  console.log('\n--- Summary ---')
  console.log(`processed: ${limited.length}`)
  console.log(`updated:   ${updated}`)
  console.log(`skipped:   ${skipped} (already correct or no card media in Mongo)`)
  console.log(`missing Mongo doc: ${missingMongo}`)
  console.log(`errors:    ${errors}`)
  console.log(`pdf heroes before run: ${pdfHeroBefore}`)
  if (isDryRun) {
    console.log('\nRe-run without --dry-run to apply changes.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
