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

const { data } = await db
  .from('articles')
  .select('id, title, legacy_mongo_id, source_url, hero_media_kind, content_stream')
  .eq('status', 'published')
  .is('hero_thumb_url', null)

for (const row of data ?? []) {
  console.log(
    JSON.stringify({
      id: row.id,
      title: row.title?.slice(0, 70),
      stream: row.content_stream,
      legacy: Boolean(row.legacy_mongo_id),
      source: row.source_url?.slice(0, 80) ?? null,
      seed: String(row.id).startsWith('a1000000'),
    })
  )
}
