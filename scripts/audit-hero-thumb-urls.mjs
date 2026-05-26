/**
 * Read-only spot-check for articles with suspicious hero_thumb_url values.
 * Loads .env.local — does not print secrets.
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

const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
const anon = process.env.SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const titlePatterns = [
  '%Apple Under Steve%',
  '%Quarterly Review Q1%',
  '%race takes off in the next big%',
  '%coatuemgmt%',
  '%shiri_shh%',
]

const needles = [
  'General Catalyst',
  'McKinsey',
  'Apple Under Steve',
  'coatue',
  'shiri_shh',
  'x.com/',
]

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(url, anon, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: rows, error } = await supabase
  .from('articles')
  .select('id, title, hero_thumb_url, source_url, hero_media_kind')
  .eq('status', 'published')
  .order('published_at', { ascending: false })
  .limit(200)

if (error) {
  console.error(error.message)
  process.exit(1)
}

function classifyHero(hero) {
  if (!hero?.trim()) return 'empty'
  try {
    const u = new URL(hero.trim())
    const host = u.hostname.toLowerCase()
    if (host.includes('x.com') || host.includes('twitter.com')) return 'x_page_url'
    if (host === 'pbs.twimg.com') return 'twitter_cdn'
    if (host === 'res.cloudinary.com') return 'cloudinary'
    if (host === 'i.ytimg.com') return 'ytimg'
    return `other:${host}`
  } catch {
    return 'invalid_url'
  }
}

const byTitle = []
for (const pat of titlePatterns) {
  const { data: hits, error: e2 } = await supabase
    .from('articles')
    .select('id, title, hero_thumb_url, source_url, hero_media_kind')
    .eq('status', 'published')
    .ilike('title', pat)
    .limit(3)
  if (!e2 && hits?.length) byTitle.push(...hits)
}

const { data: xPageRows } = await supabase
  .from('articles')
  .select('id, title, hero_thumb_url, source_url')
  .eq('status', 'published')
  .or('hero_thumb_url.ilike.%x.com%,hero_thumb_url.ilike.%twitter.com%')
  .limit(15)

const matched = rows.filter((r) =>
  needles.some(
    (n) =>
      r.title?.toLowerCase().includes(n.toLowerCase()) ||
      r.hero_thumb_url?.toLowerCase().includes(n.toLowerCase()) ||
      r.source_url?.toLowerCase().includes(n.toLowerCase())
  )
)

const xPageHeroes = rows.filter((r) => classifyHero(r.hero_thumb_url) === 'x_page_url')

const dedupe = (list) => {
  const seen = new Set()
  return list.filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })
}

console.log(
  JSON.stringify(
    {
      publishedSampled: rows.length,
      screenshotTitleMatches: dedupe(byTitle).map((r) => ({
        id: r.id,
        title: r.title?.slice(0, 80),
        heroClass: classifyHero(r.hero_thumb_url),
        hero_thumb_url: r.hero_thumb_url?.slice(0, 120) ?? null,
        source_url: r.source_url?.slice(0, 80) ?? null,
      })),
      publishedWithXPageHero: (xPageRows ?? []).map((r) => ({
        id: r.id,
        title: r.title?.slice(0, 60),
        hero_thumb_url: r.hero_thumb_url?.slice(0, 100),
      })),
      matchedByNeedle: matched.map((r) => ({
        id: r.id,
        title: r.title?.slice(0, 80),
        heroClass: classifyHero(r.hero_thumb_url),
        hero_thumb_url: r.hero_thumb_url?.slice(0, 120) ?? null,
        source_url: r.source_url?.slice(0, 80) ?? null,
        hero_media_kind: r.hero_media_kind,
      })),
      xPageHeroCountInSample: xPageHeroes.length,
      xPageHeroExamples: xPageHeroes.slice(0, 5).map((r) => ({
        id: r.id,
        title: r.title?.slice(0, 60),
        hero_thumb_url: r.hero_thumb_url?.slice(0, 100),
      })),
    },
    null,
    2
  )
)
