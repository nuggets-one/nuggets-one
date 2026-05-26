/**
 * Align Postgres `tags.is_official` to the legacy Mongo "final taxonomy":
 *   Mongo: status=active AND dimension in {format,domain,subtopic}
 *
 * This is intentionally conservative:
 * - For Postgres rows with legacy_mongo_id:
 *     is_official = true only if Mongo row is in the final taxonomy set.
 * - For Postgres rows without legacy_mongo_id:
 *     is_official = false if dimension is set (these are typically post-migration
 *     convenience tags like "Deep Dive", "Quick Read" that should not appear
 *     in public/home or old final taxonomy surfaces).
 *
 * Run:
 *   npx tsx scripts/migrate/apply-final-taxonomy-official.ts
 */
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import pg from 'pg'
import { connectMongo, disconnectMongo } from './mongo-client'

type Dimension = 'format' | 'domain' | 'subtopic'

type MongoTagRow = {
  _id: mongoose.Types.ObjectId
  status?: string
  dimension?: string
}

function isDimension(x: string | undefined): x is Dimension {
  return x === 'format' || x === 'domain' || x === 'subtopic'
}

function resolveProjectRoot(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(__dirname, '..', '..')
}

async function loadEnv() {
  const root = resolveProjectRoot()
  dotenv.config({ path: path.join(root, '.env.local'), override: false })
  dotenv.config({ path: path.join(root, '.env'), override: false })
}

async function loadMongoFinalLegacyIds(): Promise<Set<string>> {
  const TagSchema = new mongoose.Schema(
    {
      _id: mongoose.Schema.Types.ObjectId,
      status: String,
      dimension: String,
    },
    { strict: false }
  )
  const MongoTag = mongoose.models.TagFinalAudit || mongoose.model('TagFinalAudit', TagSchema, 'tags')
  const rows = (await MongoTag.find({}).lean()) as MongoTagRow[]
  const finalIds = new Set<string>()
  for (const t of rows) {
    if ((t.status ?? '').toLowerCase() !== 'active') continue
    if (!isDimension(t.dimension)) continue
    finalIds.add(String(t._id))
  }
  return finalIds
}

async function main(): Promise<number> {
  await loadEnv()
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('Missing DATABASE_URL (required)')

  await connectMongo()
  const finalLegacyIds = await loadMongoFinalLegacyIds()
  await disconnectMongo()

  const pool = new pg.Pool({ connectionString: databaseUrl })
  try {
    // 1) legacy-backed tags: official = legacy_id in final set
    const updateLegacy = await pool.query(
      `update tags
       set is_official = (legacy_mongo_id = any($1::text[]))
       where legacy_mongo_id is not null`,
      [Array.from(finalLegacyIds)]
    )

    // 2) non-legacy dimension tags should not be official on final surfaces
    const updateUnmapped = await pool.query(
      `update tags
       set is_official = false
       where legacy_mongo_id is null
         and dimension is not null
         and is_official = true`
    )

    const stats = await pool.query(
      `select
         count(*)::int as total,
         sum(case when is_official then 1 else 0 end)::int as official,
         sum(case when is_official and dimension is not null then 1 else 0 end)::int as official_dimensioned
       from tags`
    )

    console.log('\n--- Applied final taxonomy official alignment ---')
    console.log(`Mongo final taxonomy IDs: ${finalLegacyIds.size}`)
    console.log(`Updated legacy-backed rows: ${updateLegacy.rowCount}`)
    console.log(`Unset official for unmapped dimension rows: ${updateUnmapped.rowCount}`)
    console.log(
      `Postgres totals: tags=${stats.rows[0]?.total ?? 0} official=${stats.rows[0]?.official ?? 0} official+dimensioned=${stats.rows[0]?.official_dimensioned ?? 0}\n`
    )
  } finally {
    await pool.end()
  }

  return 0
}

main()
  .then((c) => process.exit(c))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

