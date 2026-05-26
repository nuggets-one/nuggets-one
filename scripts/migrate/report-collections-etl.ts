/**
 * Post-ETL report: Mongo public collections vs Postgres migrated rows.
 * Run: npx tsx scripts/migrate/report-collections-etl.ts
 */
import mongoose from 'mongoose'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { connectMongo, disconnectMongo } from './mongo-client'
import { config } from './config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
dotenv.config({ path: path.join(ROOT, '.env.local'), override: false })

const CollectionSchema = new mongoose.Schema({}, { strict: false })
const MongoCollection =
  mongoose.models.Collection ||
  mongoose.model('Collection', CollectionSchema, 'collections')

function resolveTitle(doc: Record<string, unknown>): string {
  return (
    ((doc.rawName as string) ?? '').trim() ||
    ((doc.canonicalName as string) ?? '').trim() ||
    ((doc.title as string) ?? '').trim()
  )
}

function countEntries(doc: Record<string, unknown>): number {
  const ids = new Set<string>()
  if (Array.isArray(doc.entries)) {
    for (const e of doc.entries as Array<{ articleId?: unknown }>) {
      if (e?.articleId) ids.add(String(e.articleId))
    }
  }
  if (Array.isArray(doc.articles)) {
    for (const a of doc.articles as unknown[]) {
      if (a) ids.add(String(a))
    }
  }
  return ids.size
}

async function main() {
  const db = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false },
  })

  await connectMongo()
  const mongoPublic = (await MongoCollection.find({ type: 'public' }).lean()) as Record<
    string,
    unknown
  >[]

  const { data: pgCols, error: colErr } = await db
    .from('community_collections')
    .select('id, title, legacy_mongo_id, status')
  if (colErr) throw new Error(colErr.message)

  const { count: entryCount, error: entErr } = await db
    .from('community_collection_entries')
    .select('*', { count: 'exact', head: true })
  if (entErr) throw new Error(entErr.message)

  const pgByLegacy = new Map(
    (pgCols ?? [])
      .filter((r) => r.legacy_mongo_id)
      .map((r) => [r.legacy_mongo_id as string, r])
  )

  let mongoWithTitle = 0
  let mongoEntryTotal = 0
  const missingInPg: string[] = []

  for (const doc of mongoPublic) {
    const title = resolveTitle(doc)
    if (!title) continue
    mongoWithTitle++
    mongoEntryTotal += countEntries(doc)
    const legacyId = String(doc._id)
    if (!pgByLegacy.has(legacyId)) missingInPg.push(title)
  }

  const emptyCollections = (pgCols ?? []).filter(async () => false)
  const { data: entryRows } = await db
    .from('community_collection_entries')
    .select('collection_id')

  const entriesPerCollection = new Map<string, number>()
  for (const row of entryRows ?? []) {
    const cid = row.collection_id as string
    entriesPerCollection.set(cid, (entriesPerCollection.get(cid) ?? 0) + 1)
  }

  let pgEmpty = 0
  for (const col of pgCols ?? []) {
    if ((entriesPerCollection.get(col.id as string) ?? 0) === 0) pgEmpty++
  }

  console.log('\n=== Collections ETL report ===')
  console.log('Mongo type=public:', mongoPublic.length)
  console.log('Mongo with title:', mongoWithTitle)
  console.log('Mongo entry refs (unique article ids):', mongoEntryTotal)
  console.log('Postgres collections:', pgCols?.length ?? 0)
  console.log('Postgres published:', (pgCols ?? []).filter((c) => c.status === 'published').length)
  console.log('Postgres entries:', entryCount ?? 0)
  console.log('Postgres collections with 0 entries:', pgEmpty)
  console.log('Missing in Postgres:', missingInPg.length)
  if (missingInPg.length > 0 && missingInPg.length <= 15) {
    for (const t of missingInPg) console.log('  -', t)
  }

  await disconnectMongo()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
