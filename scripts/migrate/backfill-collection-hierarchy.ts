// Backfill parent_id, is_featured, featured_order from legacy Mongo collections.
// Run after migration 20240001000018_collection_hierarchy.sql
//   npm run backfill:collection-hierarchy
//   npm run backfill:collection-hierarchy -- --dry-run

import { connectMongo, disconnectMongo } from './mongo-client'
import { db } from './supabase-client'
import mongoose from 'mongoose'

const isDryRun = process.argv.includes('--dry-run')

const CollectionSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    type: String,
    parentId: mongoose.Schema.Types.ObjectId,
    isFeatured: Boolean,
    featuredOrder: Number,
  },
  { strict: false }
)

const MongoCollection =
  mongoose.models.Collection ||
  mongoose.model('Collection', CollectionSchema, 'collections')

type LegacyDoc = {
  _id: mongoose.Types.ObjectId
  parentId?: mongoose.Types.ObjectId | string | null
  isFeatured?: boolean
  featuredOrder?: number | null
}

async function main() {
  console.log(`\n📐 Collection hierarchy backfill ${isDryRun ? '[DRY RUN]' : '[LIVE]'}\n`)

  await connectMongo()

  const mongoCols = (await MongoCollection.find({ type: 'public' }).lean()) as LegacyDoc[]
  console.log(`Mongo public collections: ${mongoCols.length}`)

  const legacyToPg = new Map<string, string>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const { data, error } = await db
      .from('community_collections')
      .select('id, legacy_mongo_id')
      .not('legacy_mongo_id', 'is', null)
      .range(from, to)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    for (const r of rows) {
      const legacy = r.legacy_mongo_id as string
      legacyToPg.set(legacy, r.id as string)
    }
    if (rows.length < pageSize) break
  }
  console.log(`Postgres legacy mappings: ${legacyToPg.size}\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const col of mongoCols) {
    const legacyId = String(col._id)
    const pgId = legacyToPg.get(legacyId)
    if (!pgId) {
      skipped++
      continue
    }

    const parentLegacy = col.parentId ? String(col.parentId) : null
    const parentPgId = parentLegacy ? legacyToPg.get(parentLegacy) ?? null : null
    if (parentLegacy && !parentPgId) {
      console.warn(`  ⚠ ${legacyId}: parent ${parentLegacy} not in Postgres`)
    }

    const isFeatured = col.isFeatured === true
    const featuredOrder =
      typeof col.featuredOrder === 'number' && Number.isFinite(col.featuredOrder)
        ? col.featuredOrder
        : null

    const patch = {
      parent_id: parentPgId,
      is_featured: isFeatured,
      featured_order: featuredOrder,
      updated_at: new Date().toISOString(),
    }

    if (isDryRun) {
      if (parentPgId || isFeatured || featuredOrder !== null) {
        console.log(
          `  [dry] ${legacyId} → parent=${parentPgId ?? 'root'} featured=${isFeatured} order=${featuredOrder}`
        )
        updated++
      } else {
        skipped++
      }
      continue
    }

    const { error } = await db.from('community_collections').update(patch).eq('id', pgId)
    if (error) {
      console.error(`  ✗ ${legacyId}: ${error.message}`)
      errors++
      continue
    }
    updated++
  }

  const roots = mongoCols.filter((c) => !c.parentId).length
  const children = mongoCols.length - roots
  console.log(`\nMongo roots=${roots} children=${children}`)
  console.log(`Done. updated=${updated} skipped=${skipped} errors=${errors}`)
  await disconnectMongo()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
