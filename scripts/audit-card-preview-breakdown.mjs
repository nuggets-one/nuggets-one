import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

const url =
  process.env.SUPABASE_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const { data: noHero } = await db
  .from('articles')
  .select('id, title, legacy_mongo_id, source_url, hero_media_kind')
  .eq('status', 'published')
  .is('hero_thumb_url', null)

const rows = noHero ?? []
const seed = rows.filter((a) => String(a.id).startsWith('a1000000'))
const withLegacy = rows.filter((a) => a.legacy_mongo_id)
const withSource = rows.filter((a) => a.source_url?.trim())

let withMedia = 0
const ids = rows.map((a) => a.id)
for (let i = 0; i < ids.length; i += 200) {
  const chunk = ids.slice(i, i + 200)
  const { data: m } = await db.from('article_media').select('article_id').in('article_id', chunk)
  withMedia += new Set((m ?? []).map((x) => x.article_id)).size
}

console.log(
  JSON.stringify(
    {
      publishedNoHeroThumb: rows.length,
      seedDemoIds: seed.length,
      withLegacyMongoId: withLegacy.length,
      withSourceUrl: withSource.length,
      noHeroButHasMediaRows: withMedia,
      seedTitles: seed.map((a) => a.title),
    },
    null,
    2
  )
)
