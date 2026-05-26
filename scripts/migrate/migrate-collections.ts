// scripts/migrate/migrate-collections.ts
// Migrates legacy Mongo community_collections → Postgres
// Run: npm run etl:collections [--dry-run]
//
// Migration Plan §3.5:
//   rawName / canonicalName / title → title (prefer rawName as display name)
//   description → description
//   curatorName (or curator derived) → curator_name
//   type='public' filter (legacy community lists; not user bookmark folders)
//   entries[].articleId OR articles[] (ObjectIds) → community_collection_entries rows
//   legacy_mongo_id stored for traceability
//
// Schema: community_collections + community_collection_entries join table
// (NOT an article_ids[] array column — use the join table)

import { connectMongo, disconnectMongo } from './mongo-client'
import { db } from './supabase-client'
import mongoose from 'mongoose'
import crypto from 'crypto'

const isDryRun = process.argv.includes('--dry-run')

// strict:false absorbs all legacy field variants (rawName, canonicalName, entries, articles, etc.)
const CollectionSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  title: String,
  rawName: String,
  canonicalName: String,
  description: String,
  curatorName: String,
  isPublic: Boolean,
  // entries may be [{ articleId: ObjectId, ... }] or articles may be [ObjectId]
  entries: [{ articleId: mongoose.Schema.Types.ObjectId }],
  articles: [mongoose.Schema.Types.ObjectId],
}, { strict: false })

const MongoCollection = mongoose.models.Collection ||
  mongoose.model('Collection', CollectionSchema, 'collections')

type LegacyCollectionDoc = {
  [key: string]: unknown
  _id: mongoose.Types.ObjectId
  title?: string
  rawName?: string
  canonicalName?: string
  description?: string
  curatorName?: string
  entries?: Array<{ articleId?: mongoose.Types.ObjectId | string | null }>
  articles?: Array<mongoose.Types.ObjectId | string | null>
}

function resolveTitle(doc: LegacyCollectionDoc): string {
  return (
    ((doc.rawName as string) ?? '').trim() ||
    ((doc.canonicalName as string) ?? '').trim() ||
    ((doc.title as string) ?? '').trim()
  )
}

// Resolve article mongo IDs from either entries[].articleId or articles[] formats
function resolveMongoArticleIds(doc: LegacyCollectionDoc): string[] {
  const ids: string[] = []

  // entries: [{ articleId: ObjectId, ... }]
  if (Array.isArray(doc.entries)) {
    for (const entry of doc.entries) {
      const aid = entry?.articleId
      if (aid) ids.push(String(aid))
    }
  }

  // articles: [ObjectId] — fallback or additional field
  if (Array.isArray(doc.articles)) {
    for (const aid of doc.articles) {
      if (aid) ids.push(String(aid))
    }
  }

  // Deduplicate
  return [...new Set(ids)]
}

async function main() {
  console.log(`\n📚 Collections migration ${isDryRun ? '[DRY RUN]' : '[LIVE]'}\n`)

  await connectMongo()

  // Legacy Mongo uses `type: 'public' | 'private'` — not `isPublic`.
  // `private` rows are user bookmark folders; only `public` are community collections.
  const mongoCols = await MongoCollection.find({ type: 'public' }).lean()
  console.log(`Found ${mongoCols.length} community collections (type=public) in Mongo`)

  // Build legacy_mongo_id → postgres article id map (paginate — Supabase caps ~1000 rows/request)
  const legacyIdMap = new Map<string, string>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const { data: articleRows, error: articleFetchErr } = await db
      .from('articles')
      .select('id, legacy_mongo_id')
      .not('legacy_mongo_id', 'is', null)
      .range(from, to)
    if (articleFetchErr) throw new Error(`Failed to fetch articles: ${articleFetchErr.message}`)
    const rows = articleRows ?? []
    for (const r of rows) {
      const legacy = r.legacy_mongo_id as string | null
      if (legacy) legacyIdMap.set(legacy, r.id as string)
    }
    if (rows.length < pageSize) break
  }
  console.log(`Loaded ${legacyIdMap.size} article ID mappings from Postgres\n`)

  const existingLegacyIds = new Set<string>()
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const { data: existingRows, error: existingErr } = await db
      .from('community_collections')
      .select('legacy_mongo_id')
      .not('legacy_mongo_id', 'is', null)
      .range(from, to)
    if (existingErr) throw new Error(`Failed to fetch existing collections: ${existingErr.message}`)
    const rows = existingRows ?? []
    for (const r of rows) {
      const id = r.legacy_mongo_id as string | null
      if (id) existingLegacyIds.add(id)
    }
    if (rows.length < pageSize) break
  }

  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const col of mongoCols as LegacyCollectionDoc[]) {
    const title = resolveTitle(col)
    if (!title) {
      console.warn(`  ⚠ Collection ${col._id} has no title — skipping`)
      continue
    }

    const legacyMongoId = String(col._id)
    if (existingLegacyIds.has(legacyMongoId)) {
      skipped++
      if (isDryRun) {
        console.log(`  [dry] skip existing "${title}" (${legacyMongoId})`)
      } else {
        console.log(`  ↷ skip existing "${title}"`)
      }
      continue
    }

    const mongoArticleIds = resolveMongoArticleIds(col)
    const resolvedArticleIds: string[] = mongoArticleIds
      .map((mid) => legacyIdMap.get(mid))
      .filter((id): id is string => !!id)

    const unmapped = mongoArticleIds.length - resolvedArticleIds.length
    if (unmapped > 0) {
      console.warn(
        `  ⚠ "${title}": ${unmapped}/${mongoArticleIds.length} articles not found in Postgres (not yet migrated?)`
      )
    }

    if (isDryRun) {
      console.log(
        `  [dry] "${title}" — ${resolvedArticleIds.length}/${mongoArticleIds.length} articles resolved`
      )
      inserted++
      continue
    }

    const id = crypto.randomUUID()

    const { error: colErr } = await db.from('community_collections').insert({
      id,
      title,
      description: (col.description as string) || null,
      curator_name: (col.curatorName as string) || 'Nuggets',
      status: 'published',
      legacy_mongo_id: legacyMongoId,
    })

    if (colErr) {
      console.error(`  ✗ Failed collection "${title}": ${colErr.message}`)
      errors++
      continue
    }

    // Insert entries into join table
    let entryErrors = 0
    for (let i = 0; i < resolvedArticleIds.length; i++) {
      const { error: entryErr } = await db.from('community_collection_entries').insert({
        collection_id: id,
        article_id: resolvedArticleIds[i],
        position: i,
      })
      if (entryErr) {
        console.warn(`  ⚠ Entry ${i} for "${title}": ${entryErr.message}`)
        entryErrors++
      }
    }

    console.log(
      `  ✓ "${title}" (${resolvedArticleIds.length - entryErrors}/${resolvedArticleIds.length} entries)`
    )
    inserted++
  }

  console.log(`\nDone. inserted=${inserted} skipped=${skipped} errors=${errors}`)
  await disconnectMongo()
}

main().catch((e) => { console.error(e); process.exit(1) })
