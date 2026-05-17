/**
 * Audit published articles for feed card preview gaps (non-YouTube focus).
 * Mirrors ArticleCard hero resolution + card-image-host gating.
 *
 *   node scripts/audit-card-preview.mjs
 *   node scripts/audit-card-preview.mjs --json
 *   node scripts/audit-card-preview.mjs --limit=20
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

const IMAGE_REMOTE_HOSTS = new Set([
  'res.cloudinary.com',
  'i.ytimg.com',
  'pbs.twimg.com',
  'i.redd.it',
  'preview.redd.it',
  'i.imgur.com',
  'media.licdn.com',
  'images.ctfassets.net',
  'substackcdn.com',
  'cdn.prod.website-files.com',
  'm.media-amazon.com',
  'www.apolloacademy.com',
  'www.apollo.com',
  'i0.wp.com',
  'storage.ghost.io',
  'sherwoodnews.imgix.net',
  'menlovc.com',
  'research-assets.cbinsights.com',
  'd1lamhf6l6yk6d.cloudfront.net',
  'assets.aboutamazon.com',
  'a.storyblok.com',
  'blogger.googleusercontent.com',
  'infobeautiful4.s3.amazonaws.com',
])

const YT_ID = /^[a-zA-Z0-9_-]{11}$/

function extractYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') return null
  const s = input.trim()
  if (!s) return null
  try {
    const u = new URL(s)
    const host = u.hostname.replace(/^www\./, '').toLowerCase()
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0]
      return YT_ID.test(id) ? id : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v')
      if (v && YT_ID.test(v)) return v
      const live = u.pathname.match(/^\/live\/([a-zA-Z0-9_-]{11})/)
      if (live) return live[1]
      const embed = u.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/)
      if (embed) return embed[1]
    }
    if (host === 'i.ytimg.com') {
      const m = u.pathname.match(/\/vi\/([a-zA-Z0-9_-]{11})\//)
      if (m) return m[1]
    }
  } catch {
    /* ignore */
  }
  return null
}

function youTubePosterHqUrl(videoId) {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`
}

function normalizeHeroThumbUrl(url) {
  const trimmed = url?.trim() ?? ''
  if (!trimmed) return null
  const videoId = extractYouTubeVideoId(trimmed)
  if (!videoId || !YT_ID.test(videoId)) return trimmed
  try {
    const host = new URL(trimmed).hostname.toLowerCase().replace(/^www\./, '')
    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtu.be' ||
      host === 'img.youtube.com'
    ) {
      return youTubePosterHqUrl(videoId)
    }
  } catch {
    return trimmed
  }
  return trimmed
}

function canRenderWithNextImage(url) {
  if (!url) return false
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const p = parsed.pathname.toLowerCase()
    if (p.endsWith('.pdf') && host !== 'res.cloudinary.com') return false
    return IMAGE_REMOTE_HOSTS.has(host)
  } catch {
    return false
  }
}

function cloudinaryFetchUrl(externalUrl) {
  const cloud =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ||
    process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
    ''
  if (!cloud) return externalUrl
  try {
    const parsed = new URL(externalUrl)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return externalUrl
    const isPdf = parsed.pathname.toLowerCase().endsWith('.pdf')
    const transforms = isPdf
      ? 'pg_1,f_auto,q_auto,w_768,c_fill,g_auto'
      : 'f_auto,q_auto,w_768,c_fill,g_auto'
    return `https://res.cloudinary.com/${cloud}/image/fetch/${transforms}/${encodeURIComponent(externalUrl)}`
  } catch {
    return externalUrl
  }
}

function resolveCardImageUrl(url) {
  if (!url) return null
  if (canRenderWithNextImage(url)) return url
  return cloudinaryFetchUrl(url)
}

function isPdfUrl(url) {
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.pdf')
  } catch {
    return false
  }
}

function isImageUrl(url) {
  if (!url) return false
  try {
    const p = new URL(url).pathname.toLowerCase()
    return /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(p) || p.includes('/image/')
  } catch {
    return false
  }
}

/** Feed card preview resolution (non-grid path). */
function resolveFeedPreview(row, mediaUrls) {
  const trimmedHeroThumb = normalizeHeroThumbUrl(row.hero_thumb_url) ?? ''
  let rawVideoId = row.hero_video_id?.trim() ?? ''
  if (!rawVideoId || !YT_ID.test(rawVideoId)) {
    for (const c of [row.hero_thumb_url, row.source_url]) {
      const from = extractYouTubeVideoId(c)
      if (from && YT_ID.test(from)) {
        rawVideoId = from
        break
      }
    }
  }
  const looksLikeYouTubeId = YT_ID.test(rawVideoId)
  const youtubePosterFallback =
    rawVideoId &&
    !trimmedHeroThumb &&
    looksLikeYouTubeId &&
    (row.hero_media_kind === 'youtube' ||
      row.hero_media_kind === null ||
      extractYouTubeVideoId(trimmedHeroThumb))
      ? youTubePosterHqUrl(rawVideoId)
      : null

  const singleGridImageFallback =
    !trimmedHeroThumb && !youtubePosterFallback && mediaUrls.length === 1
      ? mediaUrls[0].trim()
      : ''

  let heroThumbForCard =
    trimmedHeroThumb || youtubePosterFallback || singleGridImageFallback || null

  if (heroThumbForCard && isPdfUrl(heroThumbForCard)) {
    const raster = mediaUrls
      .map((u) => u.trim())
      .find((u) => u && !isPdfUrl(u) && isImageUrl(u))
    if (raster) heroThumbForCard = raster
  }

  const useThumbnailGrid = mediaUrls.length >= 2
  const youtubeIdFromSource = extractYouTubeVideoId(row.source_url)
  const hasYouTubePlayback =
    Boolean(rawVideoId) &&
    looksLikeYouTubeId &&
    (row.hero_media_kind === 'youtube' ||
      row.hero_media_kind === null ||
      (row.hero_media_kind === 'image' && Boolean(youtubeIdFromSource)))

  const showYouTubeFeedHero = !useThumbnailGrid && hasYouTubePlayback
  const resolvedUrl = resolveCardImageUrl(heroThumbForCard)
  const canShow = canRenderWithNextImage(resolvedUrl)

  return {
    heroThumbForCard,
    resolvedUrl,
    canShow,
    useThumbnailGrid,
    showYouTubeFeedHero,
    rawVideoId: looksLikeYouTubeId ? rawVideoId : null,
  }
}

function classifyIssue(row, preview, mediaCount) {
  if (preview.useThumbnailGrid) {
    const ok = preview.canShow || mediaUrlsRenderable(preview)
    if (ok) return null
    return 'grid_media_unrenderable'
  }
  if (preview.showYouTubeFeedHero) return null
  if (!preview.heroThumbForCard) {
    if (mediaCount > 0) return 'has_media_rows_but_no_hero'
    return 'no_hero_no_media'
  }
  if (!preview.resolvedUrl) return 'empty_resolved_url'
  if (!preview.canShow) {
    const hasCloudinary = Boolean(
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ||
        process.env.CLOUDINARY_CLOUD_NAME?.trim()
    )
    if (!hasCloudinary) return 'host_not_allowlisted_no_cloudinary'
    return 'cloudinary_fetch_expected'
  }
  return null
}

function mediaUrlsRenderable(preview) {
  return Boolean(preview.canShow)
}

const jsonOut = process.argv.includes('--json')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null

const url = process.env.SUPABASE_URL?.replace(/\/$/, '') || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

if (!url || !key) {
  console.error(
    'Missing Supabase URL/key. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or anon) in .env.local'
  )
  process.exit(1)
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PAGE = 500
let offset = 0
const articles = []

while (true) {
  const { data, error } = await supabase
    .from('articles')
    .select(
      'id, title, slug, source_url, hero_thumb_url, hero_media_kind, hero_video_id, status'
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + PAGE - 1)

  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  if (!data?.length) break
  articles.push(...data)
  if (data.length < PAGE) break
  offset += PAGE
}

const ids = articles.map((a) => a.id)
const mediaByArticle = new Map()

for (let i = 0; i < ids.length; i += 200) {
  const chunk = ids.slice(i, i + 200)
  const { data: media, error: mediaErr } = await supabase
    .from('article_media')
    .select('article_id, url, sort_order')
    .in('article_id', chunk)
    .order('sort_order', { ascending: true })

  if (mediaErr) {
    console.error(mediaErr.message)
    process.exit(1)
  }
  for (const row of media ?? []) {
    const list = mediaByArticle.get(row.article_id) ?? []
    if (list.length < 4) list.push(row.url)
    mediaByArticle.set(row.article_id, list)
  }
}

const hasCloudinary = Boolean(
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ||
    process.env.CLOUDINARY_CLOUD_NAME?.trim()
)

const rows = []
for (const article of articles) {
  const mediaUrls = mediaByArticle.get(article.id) ?? []
  const preview = resolveFeedPreview(article, mediaUrls)
  const isYouTube =
    article.hero_media_kind === 'youtube' ||
    Boolean(extractYouTubeVideoId(article.source_url)) ||
    Boolean(preview.showYouTubeFeedHero)

  const issue = classifyIssue(article, preview, mediaUrls.length)
  const wouldShowNoPreview =
    !preview.showYouTubeFeedHero &&
    !preview.useThumbnailGrid &&
    !preview.canShow

  if (wouldShowNoPreview || (preview.useThumbnailGrid && !preview.canShow)) {
    rows.push({
      id: article.id,
      title: article.title,
      slug: article.slug,
      isYouTube,
      issue,
      hero_media_kind: article.hero_media_kind,
      hero_thumb_url: article.hero_thumb_url,
      source_url: article.source_url,
      mediaCount: mediaUrls.length,
      heroResolved: preview.heroThumbForCard,
      resolvedUrl: preview.resolvedUrl,
    })
  }
}

const nonYoutubeBroken = rows.filter((r) => !r.isYouTube)
const youtubeBroken = rows.filter((r) => r.isYouTube)

const byIssue = {}
for (const r of rows) {
  const k = r.issue ?? 'unknown'
  byIssue[k] = (byIssue[k] ?? 0) + 1
}

const report = {
  env: {
    hasCloudinary,
    supabaseHost: new URL(url).hostname,
    publishedTotal: articles.length,
  },
  broken: {
    total: rows.length,
    nonYoutube: nonYoutubeBroken.length,
    youtube: youtubeBroken.length,
    byIssue,
  },
  samples: {
    nonYoutube: nonYoutubeBroken.slice(0, limit ?? 15),
    youtube: youtubeBroken.slice(0, 5),
  },
}

if (jsonOut) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log('Card preview audit (published articles)')
  console.log('─'.repeat(60))
  console.log(`Published total:     ${report.env.publishedTotal}`)
  console.log(`Cloudinary configured: ${report.env.hasCloudinary}`)
  console.log(`Broken previews:     ${report.broken.total}`)
  console.log(`  Non-YouTube:       ${report.broken.nonYoutube}`)
  console.log(`  YouTube:           ${report.broken.youtube}`)
  console.log('By issue:')
  for (const [k, v] of Object.entries(byIssue).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`)
  }
  if (nonYoutubeBroken.length) {
    console.log('\nNon-YouTube samples (fix priority):')
    for (const r of report.samples.nonYoutube) {
      console.log(`  • ${r.title.slice(0, 55)}`)
      console.log(`    id=${r.id} issue=${r.issue} media=${r.mediaCount}`)
      console.log(`    hero_thumb=${r.hero_thumb_url ?? '(null)'}`)
      if (r.heroResolved && r.heroResolved !== r.hero_thumb_url) {
        console.log(`    resolved=${r.heroResolved.slice(0, 80)}`)
      }
    }
  }
}

process.exit(rows.length > 0 ? 2 : 0)
