/**
 * Find articles that should show multi-image grid but may not.
 *   node scripts/diagnose-multi-image.mjs "geopolitical"
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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

const q = process.argv[2] ?? 'geopolitical'
const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(url, key)

const { data: articles } = await db
  .from('articles')
  .select('id, title, hero_thumb_url, hero_media_kind, legacy_mongo_id')
  .eq('status', 'published')
  .ilike('title', `%${q}%`)
  .limit(5)

for (const a of articles ?? []) {
  const { data: media } = await db
    .from('article_media')
    .select('id, url, kind, sort_order, hero_thumb_url')
    .eq('article_id', a.id)
    .order('sort_order')

  const imageKind = (media ?? []).filter((m) => m.kind === 'image')
  const allKinds = [...new Set((media ?? []).map((m) => m.kind))]

  console.log('\n---')
  console.log('id:', a.id)
  console.log('title:', a.title)
  console.log('hero_thumb_url:', a.hero_thumb_url?.slice(0, 80) ?? null)
  console.log('hero_media_kind:', a.hero_media_kind)
  console.log('legacy_mongo_id:', a.legacy_mongo_id)
  console.log('article_media rows:', media?.length ?? 0, 'kinds:', allKinds.join(', ') || '(none)')
  console.log('kind=image rows:', imageKind.length)
  for (const m of (media ?? []).slice(0, 8)) {
    console.log(`  [${m.sort_order}] ${m.kind} ${m.url?.slice(0, 90)}`)
  }
}
