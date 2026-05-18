import { normalizeParenTimestampsInMarkdown } from '../../lib/markdown/normalize-youtube-timestamps.ts'
import { resolveCardPreview } from '../shared/article-preview.ts'
import { db } from './supabase-client.ts'

const isDryRun = process.argv.includes('--dry-run')

const PAREN_TIMESTAMP_RE = /(^|(?<!\[)\s+)\(\d{1,2}:\d{2}(:\d{2})?\)/

function parseLimitFromArgv(argv: string[]): number | null {
  const eqArg = argv.find((arg) => arg.startsWith('--limit='))
  if (eqArg !== undefined) {
    const value = Number.parseInt(eqArg.split('=')[1], 10)
    return Number.isFinite(value) && value > 0 ? value : null
  }

  const index = argv.indexOf('--limit')
  if (index !== -1) {
    const next = argv[index + 1]
    if (next !== undefined && !next.startsWith('-')) {
      const value = Number.parseInt(next, 10)
      return Number.isFinite(value) && value > 0 ? value : null
    }
  }

  return null
}

const LIMIT = parseLimitFromArgv(process.argv)
const PAGE_SIZE = 250

async function main() {
  console.log(
    `\n⏱ YouTube timestamp link backfill ${isDryRun ? '[DRY RUN]' : '[LIVE]'}${LIMIT ? ` [LIMIT ${LIMIT}]` : ''}\n`,
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
      scanned++
      const raw = row.content_markdown?.trim() ?? ''
      if (!raw || !PAREN_TIMESTAMP_RE.test(raw)) {
        skipped++
        continue
      }

      const nextMarkdown = normalizeParenTimestampsInMarkdown(raw)
      if (nextMarkdown === raw) {
        skipped++
        continue
      }

      const nextCardPreview = resolveCardPreview({
        content_markdown: nextMarkdown,
        excerpt: row.excerpt,
      })

      if (!isDryRun) {
        const { error: updateError } = await db
          .from('articles')
          .update({
            content_markdown: nextMarkdown,
            card_preview: nextCardPreview,
          })
          .eq('id', row.id)

        if (updateError) {
          throw new Error(`Failed to update ${row.id}: ${updateError.message}`)
        }
      }

      updated++
      console.log(`  ${isDryRun ? 'would update' : 'updated'} ${row.id}`)
    }

    offset += rows.length
    if (rows.length < remaining) break
  }

  console.log(`\nDone. scanned=${scanned} updated=${updated} skipped=${skipped}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
