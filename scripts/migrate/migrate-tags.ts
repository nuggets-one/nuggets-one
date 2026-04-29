// scripts/migrate/migrate-tags.ts
// Migrates legacy Mongo tags → Postgres tags table
// Run: npm run etl:tags [--dry-run]
//
// Migration plan §3.3 field mapping:
//   canonicalName → slug (normalized)
//   rawName       → label
//   isOfficial    → is_official
//   dimension     → dimension
//
// Dedup rule: if multiple Mongo docs share the same canonicalName, keep the
// one with the lowest ObjectId-derived created_at; log and skip the rest.

import { connectMongo, disconnectMongo } from './mongo-client'
import { db } from './supabase-client'
import mongoose from 'mongoose'

const isDryRun = process.argv.includes('--dry-run')

const TagSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  rawName: String,
  canonicalName: String,
  isOfficial: Boolean,
  dimension: String,
}, { strict: false })

const MongoTag = mongoose.models.Tag || mongoose.model('Tag', TagSchema, 'tags')

function objectIdToDate(id: mongoose.Types.ObjectId): Date {
  return new Date(parseInt(id.toString().slice(0, 8), 16) * 1000)
}

function normalizeSlug(raw: string | null | undefined): string {
  return (raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function main() {
  console.log(`\n🏷  Tag migration ${isDryRun ? '[DRY RUN]' : '[LIVE]'}\n`)

  await connectMongo()

  const mongoTags = await MongoTag.find({}).lean()
  console.log(`Found ${mongoTags.length} tags in Mongo`)

  // Dedup: group by normalized canonicalName, keep oldest (lowest ObjectId timestamp)
  const bySlug = new Map<string, (typeof mongoTags)[number]>()
  const discarded: string[] = []

  for (const tag of mongoTags) {
    const slug = normalizeSlug(tag.canonicalName as string)
    if (!slug) {
      console.warn(`  ⚠ Tag ${tag._id} has no canonicalName — skipping`)
      discarded.push(String(tag._id))
      continue
    }

    const existing = bySlug.get(slug)
    if (!existing) {
      bySlug.set(slug, tag)
    } else {
      const existingDate = objectIdToDate(existing._id as mongoose.Types.ObjectId)
      const currentDate = objectIdToDate(tag._id as mongoose.Types.ObjectId)
      if (currentDate < existingDate) {
        // current is older — it wins
        discarded.push(String(existing._id))
        bySlug.set(slug, tag)
      } else {
        discarded.push(String(tag._id))
      }
    }
  }

  if (discarded.length > 0) {
    console.log(`  ⚠ Deduped ${discarded.length} tags (kept oldest per canonical name):`)
    console.log(`    ${discarded.join(', ')}`)
  }

  const dedupedTags = Array.from(bySlug.values())
  console.log(`Upserting ${dedupedTags.length} unique tags\n`)

  let inserted = 0
  let errors = 0

  for (const tag of dedupedTags) {
    const slug = normalizeSlug(tag.canonicalName as string)
    const label = ((tag.rawName as string) ?? '').trim()

    if (!label) {
      console.warn(`  ⚠ Tag ${tag._id} (${slug}) has no rawName — skipping`)
      continue
    }

    if (isDryRun) {
      console.log(
        `  [dry] Would upsert tag: ${slug} (${label}) official=${!!tag.isOfficial} dim=${tag.dimension ?? 'null'}`
      )
      inserted++
      continue
    }

    const { error } = await db.from('tags').upsert(
      {
        slug,
        label,
        is_official: !!tag.isOfficial,
        dimension: (tag.dimension as string) || null,
        legacy_mongo_id: String(tag._id),
      },
      { onConflict: 'slug', ignoreDuplicates: false }
    )

    if (error) {
      console.error(`  ✗ Failed tag ${slug}: ${error.message}`)
      errors++
    } else {
      console.log(`  ✓ ${slug} (${label})`)
      inserted++
    }
  }

  console.log(`\nDone. inserted/updated=${inserted} errors=${errors} deduped=${discarded.length}`)
  await disconnectMongo()
}

main().catch((e) => { console.error(e); process.exit(1) })
