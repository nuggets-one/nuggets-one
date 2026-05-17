/**
 * Count published legacy articles where article_media image rows < Mongo card gallery.
 *   node scripts/audit-gallery-sync.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose, { Types } from 'mongoose'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const name of ['.env.local', '.env']) {
  const p = path.join(root, name)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

const { createClient } = await import('@supabase/supabase-js')
const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const db = createClient(url, key)

const { data: articles } = await db
  .from('articles')
  .select('id, title, legacy_mongo_id')
  .eq('status', 'published')
  .not('legacy_mongo_id', 'is', null)

const ids = (articles ?? []).map((a) => a.id)
const pgCounts = new Map()
for (let i = 0; i < ids.length; i += 200) {
  const chunk = ids.slice(i, i + 200)
  const { data } = await db
    .from('article_media')
    .select('article_id, kind')
    .in('article_id', chunk)
  for (const row of data ?? []) {
    if (row.kind !== 'image') continue
    pgCounts.set(row.article_id, (pgCounts.get(row.article_id) ?? 0) + 1)
  }
}

await mongoose.connect(process.env.MONGODB_URI)
const { resolveLegacyMedia } = await import('./migrate/legacy-article-media.ts')

let needsSync = 0
const samples = []

for (const article of articles ?? []) {
  if (!Types.ObjectId.isValid(article.legacy_mongo_id)) continue
  const doc = await mongoose.connection.db
    .collection('articles')
    .findOne({ _id: new Types.ObjectId(article.legacy_mongo_id) })
  if (!doc) continue
  const resolved = resolveLegacyMedia(doc)
  const stored = pgCounts.get(article.id) ?? 0
  const legacy = resolved.cardMedia.length
  if (legacy >= 2 && stored < legacy) {
    needsSync++
    if (samples.length < 8) {
      samples.push({ title: article.title?.slice(0, 60), stored, legacy, id: article.id })
    }
  }
}

await mongoose.disconnect()

console.log(JSON.stringify({ publishedLegacy: articles?.length, needsGallerySync: needsSync, samples }, null, 2))
