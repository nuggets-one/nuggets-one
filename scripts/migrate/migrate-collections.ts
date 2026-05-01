// scripts/migrate/migrate-collections.ts
// Migrates legacy Mongo community_collections → Postgres
// Run: npm run etl:collections [--dry-run]
//
// Migration Plan §3.5:
//   rawName / canonicalName / title → title (prefer rawName as display name)
//   description → description
//   curatorName (or curator derived) → curator_name
//   isPublic=true filter (only public collections migrate)
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

  const mongoCols = await MongoCollection.find({ isPublic: true }).lean()
  console.log(`Found ${mongoCols.length} public collections in Mongo`)

  // Build legacy_mongo_id → postgres article id map
  const { data: articleRows, error: articleFetchErr } = await db
    .from('articles')
    .select('id, legacy_mongo_id')
  if (articleFetchErr) throw new Error(`Failed to fetch articles: ${articleFetchErr.message}`)

  const legacyIdMap = new Map<string, string>(
    (articleRows ?? [])
      .filter((r) => r.legacy_mongo_id)
      .map((r) => [r.legacy_mongo_id as string, r.id as string])
  )
  console.log(`Loaded ${legacyIdMap.size} article ID mappings from Postgres\n`)

  let inserted = 0
  let errors = 0

  for (const col of mongoCols as LegacyCollectionDoc[]) {
    const title = resolveTitle(col)
    if (!title) {
      console.warn(`  ⚠ Collection ${col._id} has no title — skipping`)
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
      legacy_mongo_id: String(col._id),
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

  console.log(`\nDone. inserted=${inserted} errors=${errors}`)
  await disconnectMongo()
}

main().catch((e) => { console.error(e); process.exit(1) })
