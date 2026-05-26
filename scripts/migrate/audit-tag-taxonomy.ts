/**
 * Audit legacy Mongo tag taxonomy vs current Postgres tags.
 *
 * Goal: explain why extra classification chips appear by comparing
 * Mongo "final taxonomy" (status=active + dimension in format|domain|subtopic)
 * vs Postgres tags (dimensioned + is_official).
 *
 * Run:
 *   npx tsx scripts/migrate/audit-tag-taxonomy.ts
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
  rawName?: string
  canonicalName?: string
  status?: string
  isOfficial?: boolean
  dimension?: string
  aliases?: unknown
  sortOrder?: unknown
}

type PgTagRow = {
  id: string
  slug: string
  label: string
  dimension: string | null
  is_official: boolean
  legacy_mongo_id: string | null
}

type Report = {
  generatedAt: string
  mongo: {
    total: number
    activeDimensioned: number
    activeDimensionedByDim: Record<Dimension, number>
    missingLegacyFieldsSample: string[]
  }
  postgres: {
    total: number
    dimensioned: number
    official: number
    officialDimensioned: number
  }
  buckets: {
    old_taxonomy_final: Array<{ label: string; dimension: string; mongo_id: string; status: string | null }>
    mongo_inactive_but_pg_official: Array<{ label: string; slug: string; dimension: string | null; mongo_status: string | null }>
    pg_official_not_in_old_taxonomy: Array<{ label: string; slug: string; dimension: string | null; legacy_mongo_id: string | null }>
    pg_dimensioned_not_in_old_taxonomy: Array<{ label: string; slug: string; dimension: string | null; legacy_mongo_id: string | null }>
    unmapped_pg: Array<{ label: string; slug: string; dimension: string | null }>
  }
  notes: string[]
}

function isDimension(x: string | undefined): x is Dimension {
  return x === 'format' || x === 'domain' || x === 'subtopic'
}

function safeStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return []
  return x.map((v) => (typeof v === 'string' ? v : '')).filter(Boolean)
}

function normalizeLabel(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
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

async function loadMongoTags(): Promise<MongoTagRow[]> {
  const TagSchema = new mongoose.Schema(
    {
      _id: mongoose.Schema.Types.ObjectId,
      rawName: String,
      canonicalName: String,
      status: String,
      isOfficial: Boolean,
      dimension: String,
      aliases: [String],
      sortOrder: mongoose.Schema.Types.Mixed,
    },
    { strict: false }
  )

  const MongoTag = mongoose.models.TagAudit || mongoose.model('TagAudit', TagSchema, 'tags')
  const rows = (await MongoTag.find({}).lean()) as MongoTagRow[]
  return rows
}

async function loadPgTags(databaseUrl: string): Promise<PgTagRow[]> {
  const pool = new pg.Pool({ connectionString: databaseUrl })
  try {
    const r = await pool.query(
      `select id::text, slug, label, dimension, is_official, legacy_mongo_id
       from tags
       order by label asc`
    )
    return r.rows as PgTagRow[]
  } finally {
    await pool.end()
  }
}

async function main(): Promise<number> {
  await loadEnv()

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('Missing DATABASE_URL (required to query Postgres tags table)')

  await connectMongo()
  const mongo = await loadMongoTags()
  await disconnectMongo()

  const pgTags = await loadPgTags(databaseUrl)

  const mongoById = new Map<string, MongoTagRow>()
  const aliasToCanonical = new Map<string, string>()

  for (const t of mongo) {
    const id = String(t._id)
    mongoById.set(id, t)
    const raw = typeof t.rawName === 'string' ? normalizeLabel(t.rawName) : ''
    const aliases = safeStringArray(t.aliases).map(normalizeLabel)
    for (const a of aliases) {
      if (a && raw) aliasToCanonical.set(a.toLowerCase(), raw)
    }
  }

  const oldFinalMongo = mongo
    .filter((t) => (t.status ?? '').toLowerCase() === 'active' && isDimension(t.dimension))
    .map((t) => ({
      label: normalizeLabel(typeof t.rawName === 'string' ? t.rawName : ''),
      dimension: String(t.dimension),
      mongo_id: String(t._id),
      status: (t.status ?? null) as string | null,
    }))
    .filter((t) => t.label)

  const oldFinalMongoIds = new Set(oldFinalMongo.map((t) => t.mongo_id))

  const mongoStats = {
    total: mongo.length,
    activeDimensioned: oldFinalMongo.length,
    activeDimensionedByDim: {
      format: oldFinalMongo.filter((t) => t.dimension === 'format').length,
      domain: oldFinalMongo.filter((t) => t.dimension === 'domain').length,
      subtopic: oldFinalMongo.filter((t) => t.dimension === 'subtopic').length,
    } as Record<Dimension, number>,
    missingLegacyFieldsSample: mongo
      .filter((t) => typeof t.status !== 'string' || !t.status)
      .slice(0, 10)
      .map((t) => String(t._id)),
  }

  const pgStats = {
    total: pgTags.length,
    dimensioned: pgTags.filter((t) => t.dimension != null).length,
    official: pgTags.filter((t) => t.is_official).length,
    officialDimensioned: pgTags.filter((t) => t.is_official && t.dimension != null).length,
  }

  const buckets: Report['buckets'] = {
    old_taxonomy_final: oldFinalMongo.sort((a, b) => a.dimension.localeCompare(b.dimension) || a.label.localeCompare(b.label)),
    mongo_inactive_but_pg_official: [],
    pg_official_not_in_old_taxonomy: [],
    pg_dimensioned_not_in_old_taxonomy: [],
    unmapped_pg: [],
  }

  for (const t of pgTags) {
    const mongoRow = t.legacy_mongo_id ? mongoById.get(String(t.legacy_mongo_id)) : undefined
    const mongoStatus = mongoRow?.status ? String(mongoRow.status) : null
    const inOldFinal = t.legacy_mongo_id ? oldFinalMongoIds.has(String(t.legacy_mongo_id)) : false

    if (!t.legacy_mongo_id) {
      buckets.unmapped_pg.push({ label: t.label, slug: t.slug, dimension: t.dimension })
      continue
    }

    if (t.is_official && !inOldFinal) {
      buckets.pg_official_not_in_old_taxonomy.push({
        label: t.label,
        slug: t.slug,
        dimension: t.dimension,
        legacy_mongo_id: t.legacy_mongo_id,
      })
    }

    if (t.dimension != null && !inOldFinal) {
      buckets.pg_dimensioned_not_in_old_taxonomy.push({
        label: t.label,
        slug: t.slug,
        dimension: t.dimension,
        legacy_mongo_id: t.legacy_mongo_id,
      })
    }

    if (t.is_official && mongoStatus && mongoStatus.toLowerCase() !== 'active') {
      buckets.mongo_inactive_but_pg_official.push({
        label: t.label,
        slug: t.slug,
        dimension: t.dimension,
        mongo_status: mongoStatus,
      })
    }
  }

  const notes: string[] = []
  if (mongoStats.activeDimensioned !== 37) {
    notes.push(
      `Mongo active+dimensioned taxonomy count is ${mongoStats.activeDimensioned} (expected ~37 based on old UI). This may indicate environment drift or missing status fields.`
    )
  }
  if (buckets.pg_official_not_in_old_taxonomy.length > 0) {
    notes.push(
      `Found ${buckets.pg_official_not_in_old_taxonomy.length} Postgres tags marked official that are not in Mongo active+dimensioned taxonomy. These will inflate homepage filters.`
    )
  }
  if (buckets.pg_dimensioned_not_in_old_taxonomy.length > 0) {
    notes.push(
      `Found ${buckets.pg_dimensioned_not_in_old_taxonomy.length} Postgres tags with a dimension but not in Mongo active+dimensioned taxonomy. These will inflate admin classification lists if not filtered.`
    )
  }

  // Alias hinting for quick “why do I see Knowledge Byte + Knowledge Bytes?” style issues.
  const aliasHits = pgTags
    .filter((t) => aliasToCanonical.has(t.label.toLowerCase()))
    .slice(0, 25)
    .map((t) => `${t.label} → ${aliasToCanonical.get(t.label.toLowerCase())}`)
  if (aliasHits.length > 0) {
    notes.push(`Sample alias-labeled tags present as standalone rows: ${aliasHits.join('; ')}`)
  }

  const report: Report = {
    generatedAt: new Date().toISOString(),
    mongo: mongoStats,
    postgres: pgStats,
    buckets: {
      old_taxonomy_final: buckets.old_taxonomy_final,
      mongo_inactive_but_pg_official: buckets.mongo_inactive_but_pg_official.sort((a, b) => a.label.localeCompare(b.label)),
      pg_official_not_in_old_taxonomy: buckets.pg_official_not_in_old_taxonomy.sort((a, b) => a.label.localeCompare(b.label)),
      pg_dimensioned_not_in_old_taxonomy: buckets.pg_dimensioned_not_in_old_taxonomy.sort((a, b) => a.label.localeCompare(b.label)),
      unmapped_pg: buckets.unmapped_pg.sort((a, b) => a.label.localeCompare(b.label)),
    },
    notes,
  }

  const root = resolveProjectRoot()
  const outDir = path.join(root, 'scripts', 'migrate', 'output')
  const outPath = path.join(outDir, `tag-taxonomy-audit.${Date.now()}.json`)
  await (await import('fs/promises')).mkdir(outDir, { recursive: true })
  await (await import('fs/promises')).writeFile(outPath, JSON.stringify(report, null, 2), 'utf8')

  console.log('\n--- Tag taxonomy audit ---')
  console.log(`Mongo tags: ${mongoStats.total}`)
  console.log(
    `Mongo active+dimensioned: ${mongoStats.activeDimensioned} (format=${mongoStats.activeDimensionedByDim.format}, domain=${mongoStats.activeDimensionedByDim.domain}, subtopic=${mongoStats.activeDimensionedByDim.subtopic})`
  )
  console.log(`Postgres tags: ${pgStats.total}`)
  console.log(`Postgres official: ${pgStats.official} (official+dimensioned=${pgStats.officialDimensioned})`)
  console.log(`Bucket pg_official_not_in_old_taxonomy: ${report.buckets.pg_official_not_in_old_taxonomy.length}`)
  console.log(`Bucket pg_dimensioned_not_in_old_taxonomy: ${report.buckets.pg_dimensioned_not_in_old_taxonomy.length}`)
  console.log(`Bucket mongo_inactive_but_pg_official: ${report.buckets.mongo_inactive_but_pg_official.length}`)
  console.log(`Unmapped Postgres tags (no legacy_mongo_id): ${report.buckets.unmapped_pg.length}`)
  console.log(`Report written: ${outPath}\n`)

  if (notes.length > 0) {
    console.log('Notes:')
    for (const n of notes) console.log(`- ${n}`)
    console.log('')
  }

  return 0
}

main()
  .then((c) => process.exit(c))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

