// Upload legacy external card heroes into Cloudinary (permanent res.cloudinary.com URLs).
//
// Run from scripts/migrate (flags forward correctly here):
//   npx tsx backfill-external-heroes-to-cloudinary.ts --dry-run
//   npx tsx backfill-external-heroes-to-cloudinary.ts --limit=20
//   npx tsx backfill-external-heroes-to-cloudinary.ts --article-id=<uuid>
//
// Requires:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
//   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME (or CLOUDINARY_CLOUD_NAME)

import { db } from './supabase-client'
import { readCloudinaryUploadConfig, uploadRemoteImageToCloudinary } from './cloudinary-upload'
import {
  classifyHeroForCloudinaryUpload,
  shouldSkipUploadForPassthrough,
} from './hero-upload-candidates'

const isDryRun = process.argv.includes('--dry-run')
const UPLOAD_FOLDER = 'uploads/migrated-heroes'
const DELAY_MS = 350

function parseLimitFromArgv(argv: string[]): number | null {
  const eqArg = argv.find((a) => a.startsWith('--limit='))
  if (eqArg !== undefined) {
    const n = parseInt(eqArg.split('=')[1], 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const idx = argv.indexOf('--limit')
  if (idx !== -1) {
    const next = argv[idx + 1]
    if (next !== undefined && !next.startsWith('-')) {
      const n = parseInt(next, 10)
      return Number.isFinite(n) && n > 0 ? n : null
    }
  }
  return null
}

function parseArticleId(argv: string[]): string | null {
  const eq = argv.find((a) => a.startsWith('--article-id='))
  if (eq) return eq.split('=')[1]?.trim() || null
  const idx = argv.indexOf('--article-id')
  if (idx !== -1) {
    const next = argv[idx + 1]
    if (next && !next.startsWith('-')) return next.trim()
  }
  return null
}

const LIMIT = parseLimitFromArgv(process.argv)
const ARTICLE_ID = parseArticleId(process.argv)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type ArticleRow = {
  id: string
  title: string
  legacy_mongo_id: string | null
  hero_thumb_url: string | null
  hero_media_kind: string | null
}

async function loadCandidates(): Promise<ArticleRow[]> {
  let query = db
    .from('articles')
    .select('id, title, legacy_mongo_id, hero_thumb_url, hero_media_kind')
    .not('legacy_mongo_id', 'is', null)
    .not('hero_thumb_url', 'is', null)

  if (ARTICLE_ID) {
    query = query.eq('id', ARTICLE_ID)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load articles: ${error.message}`)

  const rows = (data ?? []) as ArticleRow[]
  const candidates: ArticleRow[] = []

  for (const row of rows) {
    const classified = classifyHeroForCloudinaryUpload(row.hero_thumb_url)
    if (!classified.needsUpload || !classified.normalized) continue
    if (await shouldSkipUploadForPassthrough(classified.normalized)) continue
    candidates.push(row)
  }

  return LIMIT ? candidates.slice(0, LIMIT) : candidates
}

async function applyUpload(
  row: ArticleRow,
  config: NonNullable<ReturnType<typeof readCloudinaryUploadConfig>>
): Promise<'updated' | 'skipped' | 'error'> {
  const { normalized } = classifyHeroForCloudinaryUpload(row.hero_thumb_url)
  if (!normalized) return 'skipped'

  const oldUrl = normalized

  if (isDryRun) {
    console.log(`  [dry-run] ${row.title.slice(0, 60)}`)
    console.log(`    ${oldUrl.slice(0, 90)}`)
    return 'updated'
  }

  const result = await uploadRemoteImageToCloudinary(oldUrl, {
    folder: UPLOAD_FOLDER,
    config,
  })

  if (!result.ok) {
    console.error(`  ✗ ${row.title.slice(0, 50)} — ${result.message}`)
    return 'error'
  }

  const newUrl = result.url
  const { error: articleError } = await db
    .from('articles')
    .update({
      hero_thumb_url: newUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)

  if (articleError) {
    console.error(`  ✗ update articles: ${articleError.message}`)
    return 'error'
  }

  const rawHero = row.hero_thumb_url?.trim() ?? ''
  for (const matchUrl of [...new Set([rawHero, oldUrl].filter(Boolean))]) {
    const { error: mediaError } = await db
      .from('article_media')
      .update({ url: newUrl, hero_thumb_url: newUrl })
      .eq('article_id', row.id)
      .eq('url', matchUrl)

    if (mediaError) {
      console.warn(`  ⚠ article_media sync (${matchUrl.slice(0, 40)}): ${mediaError.message}`)
    }
  }

  console.log(`  ✓ ${row.title.slice(0, 70)}`)
  return 'updated'
}

async function main() {
  console.log(
    `Backfill external heroes → Cloudinary${isDryRun ? ' (DRY RUN)' : ''}${LIMIT ? ` [limit ${LIMIT}]` : ''}`
  )

  const cloudinaryConfig = readCloudinaryUploadConfig()
  if (!cloudinaryConfig) {
    throw new Error(
      'Missing Cloudinary upload credentials. Set CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, and NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.'
    )
  }

  const candidates = await loadCandidates()
  console.log(`Candidates to upload: ${candidates.length}\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const row of candidates) {
    const outcome = await applyUpload(row, cloudinaryConfig)
    if (outcome === 'updated') updated++
    else if (outcome === 'error') errors++
    else skipped++

    if (!isDryRun) await sleep(DELAY_MS)
  }

  console.log('\n--- Summary ---')
  console.log(`candidates: ${candidates.length}`)
  console.log(`updated:    ${updated}`)
  console.log(`skipped:    ${skipped}`)
  console.log(`errors:     ${errors}`)
  if (isDryRun) {
    console.log('\nRe-run without --dry-run to upload.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
