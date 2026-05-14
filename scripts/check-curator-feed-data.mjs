/**
 * Read-only: card chip uses `articles.curator_display_name` (anon — same as public feed).
 * Loads .env.local then .env — no secrets printed.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function loadEnvFile(name) {
  const p = path.join(root, name)
  if (!fs.existsSync(p)) return
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

loadEnvFile('.env.local')
loadEnvFile('.env')

function shortId(uuid) {
  if (typeof uuid !== 'string' || uuid.length < 8) return uuid ?? '(none)'
  return `${uuid.slice(0, 8)}…`
}

const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
const anon = process.env.SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_ANON_KEY. Add them to .env.local (repo root) and re-run:\n' +
      '  node scripts/check-curator-feed-data.mjs'
  )
  process.exit(1)
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(url, anon, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { count: totalPub, error: eTotal } = await supabase
  .from('articles')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'published')

const { count: nullCuratorName, error: eNull } = await supabase
  .from('articles')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'published')
  .is('curator_display_name', null)

const { data: sample, error: eSample } = await supabase
  .from('articles')
  .select('id, curator_display_name')
  .eq('status', 'published')
  .order('published_at', { ascending: false })
  .limit(12)

const report = {
  env: { loadedFrom: ['.env.local', '.env'].filter((n) => fs.existsSync(path.join(root, n))) },
  publishedArticles: {
    total: totalPub ?? null,
    withNullCuratorDisplayName: nullCuratorName ?? null,
    errors: [eTotal?.message, eNull?.message, eSample?.message].filter(Boolean),
  },
  recentPublishedSample: (sample ?? []).map((r) => ({
    article: shortId(r.id),
    curator_display_name:
      typeof r.curator_display_name === 'string' && r.curator_display_name.trim()
        ? `set (${r.curator_display_name.trim().length} chars)`
        : 'NULL_OR_EMPTY',
  })),
  interpretation: {
    chipShowsNWhen: 'curator_display_name is null or empty on the article row.',
    hint:
      'Set your name in /account, apply migration 20240001000014, then run scripts/sql/backfill_curator_display_name.sql once (replace YOUR_USER_UUID). Admin Save/Publish refreshes the column for that article.',
  },
}

console.log(JSON.stringify(report, null, 2))
