import { db } from './supabase-client'
import { resolveCardPreview } from '../shared/article-preview'

const isDryRun = process.argv.includes('--dry-run')

function parseLimitFromArgv(argv: string[]): number | null {
  const eqArg = argv.find((arg) => arg.startsWith('--limit='))
  if (eqArg !== undefined) {
    const value = parseInt(eqArg.split('=')[1], 10)
    return Number.isFinite(value) && value > 0 ? value : null
  }

  const index = argv.indexOf('--limit')
  if (index !== -1) {
    const next = argv[index + 1]
    if (next !== undefined && !next.startsWith('-')) {
      const value = parseInt(next, 10)
      return Number.isFinite(value) && value > 0 ? value : null
    }
  }

  return null
}

const LIMIT = parseLimitFromArgv(process.argv)
const PAGE_SIZE = 250

async function main() {
  console.log(
    `\n🧩 Card preview backfill ${isDryRun ? '[DRY RUN]' : '[LIVE]'}${LIMIT ? ` [LIMIT ${LIMIT}]` : ''}\n`
  )

  let offset = 0
  let scanned = 0
  let updated = 0
  let skipped = 0

  while (LIMIT === null || scanned < LIMIT) {
    const remaining = LIMIT === null ? PAGE_SIZE : Math.min(PAGE_SIZE, LIMIT - scanned)
    const { data, error } = await db
      .from('articles')
      .select('id, excerpt, content_markdown, card_preview')
      .order('id', { ascending: true })
      .range(offset, offset + remaining - 1)

    if (error) throw new Error(`Failed to fetch articles: ${error.message}`)

    const rows = (data ?? []) as Array<{
      id: string
      excerpt: string | null
      content_markdown: string | null
      card_preview: string | null
    }>

    if (rows.length === 0) break

    for (const row of rows) {
      const nextCardPreview = resolveCardPreview({
        content_markdown: row.content_markdown,
        excerpt: row.excerpt,
      })

      if (nextCardPreview === row.card_preview) {
        skipped++
        scanned++
        continue
      }

      if (!isDryRun) {
        const { error: updateError } = await db
          .from('articles')
          .update({ card_preview: nextCardPreview })
          .eq('id', row.id)

        if (updateError) {
          throw new Error(`Failed to update ${row.id}: ${updateError.message}`)
        }
      }

      updated++
      scanned++
    }

    offset += rows.length
    if (rows.length < remaining) break
  }

  console.log(`Done. scanned=${scanned} updated=${updated} skipped=${skipped}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
