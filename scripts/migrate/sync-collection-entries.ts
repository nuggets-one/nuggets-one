/**
 * Backfill community_collection_entries for collections already inserted.
 * Use after fixing article ID pagination in migrate-collections.ts.
 *
 * Run: npx tsx scripts/migrate/sync-collection-entries.ts [--dry-run]
 */
import mongoose from 'mongoose'
import { connectMongo, disconnectMongo } from './mongo-client'
import { db } from './supabase-client'

const isDryRun = process.argv.includes('--dry-run')

const CollectionSchema = new mongoose.Schema({}, { strict: false })
const MongoCollection =
  mongoose.models.Collection ||
  mongoose.model('Collection', CollectionSchema, 'collections')

type LegacyCollectionDoc = {
  [key: string]: unknown
  _id: mongoose.Types.ObjectId
  rawName?: string
  canonicalName?: string
  title?: string
  entries?: Array<{ articleId?: mongoose.Types.ObjectId | string | null }>
  articles?: Array<mongoose.Types.ObjectId | string | null>
}

function resolveMongoArticleIds(doc: LegacyCollectionDoc): string[] {
  const ids: string[] = []
  if (Array.isArray(doc.entries)) {
    for (const entry of doc.entries) {
      const aid = entry?.articleId
      if (aid) ids.push(String(aid))
    }
  }
  if (Array.isArray(doc.articles)) {
    for (const aid of doc.articles) {
      if (aid) ids.push(String(aid))
    }
  }
  return [...new Set(ids)]
}

async function loadLegacyArticleMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const { data, error } = await db
      .from('articles')
      .select('id, legacy_mongo_id')
      .not('legacy_mongo_id', 'is', null)
      .range(from, to)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    for (const r of rows) {
      const legacy = r.legacy_mongo_id as string
      map.set(legacy, r.id as string)
    }
    if (rows.length < pageSize) break
  }
  return map
}

async function loadPgCollectionsByLegacy(): Promise<Map<string, { id: string; title: string }>> {
  const map = new Map<string, { id: string; title: string }>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const { data, error } = await db
      .from('community_collections')
      .select('id, title, legacy_mongo_id')
      .not('legacy_mongo_id', 'is', null)
      .range(from, to)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    for (const r of rows) {
      map.set(r.legacy_mongo_id as string, {
        id: r.id as string,
        title: r.title as string,
      })
    }
    if (rows.length < pageSize) break
  }
  return map
}

async function loadExistingEntryKeys(): Promise<Set<string>> {
  const keys = new Set<string>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const { data, error } = await db
      .from('community_collection_entries')
      .select('collection_id, article_id')
      .range(from, to)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    for (const r of rows) {
      keys.add(`${r.collection_id}:${r.article_id}`)
    }
    if (rows.length < pageSize) break
  }
  return keys
}

async function main() {
  console.log(`\n📎 Sync collection entries ${isDryRun ? '[DRY RUN]' : '[LIVE]'}\n`)

  await connectMongo()
  const [legacyIdMap, pgByLegacy, existingKeys] = await Promise.all([
    loadLegacyArticleMap(),
    loadPgCollectionsByLegacy(),
    loadExistingEntryKeys(),
  ])

  console.log(`Article mappings: ${legacyIdMap.size}`)
  console.log(`Postgres collections: ${pgByLegacy.size}`)
  console.log(`Existing entry pairs: ${existingKeys.size}\n`)

  const mongoCols = await MongoCollection.find({ type: 'public' }).lean()
  let added = 0
  let collectionsTouched = 0

  for (const col of mongoCols as LegacyCollectionDoc[]) {
    const legacyMongoId = String(col._id)
    const pg = pgByLegacy.get(legacyMongoId)
    if (!pg) continue

    const mongoArticleIds = resolveMongoArticleIds(col)
    const resolvedIds = mongoArticleIds
      .map((mid) => legacyIdMap.get(mid))
      .filter((id): id is string => !!id)

    const toInsert: Array<{ collection_id: string; article_id: string; position: number }> = []
    let position = 0
    for (const articleId of resolvedIds) {
      const key = `${pg.id}:${articleId}`
      if (existingKeys.has(key)) {
        position++
        continue
      }
      toInsert.push({ collection_id: pg.id, article_id: articleId, position })
      existingKeys.add(key)
      position++
    }

    if (toInsert.length === 0) continue
    collectionsTouched++

    if (isDryRun) {
      console.log(`  [dry] "${pg.title}" +${toInsert.length} entries`)
      added += toInsert.length
      continue
    }

    for (const row of toInsert) {
      const { error } = await db.from('community_collection_entries').insert(row)
      if (error) {
        console.warn(`  ⚠ "${pg.title}" entry: ${error.message}`)
      } else {
        added++
      }
    }
    console.log(`  ✓ "${pg.title}" +${toInsert.length} entries`)
  }

  console.log(`\nDone. entries_added=${added} collections_updated=${collectionsTouched}`)
  await disconnectMongo()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
