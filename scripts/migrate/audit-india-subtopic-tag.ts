/**
 * Audit articles tagged with `india-focused` (domain) but missing the `india`
 * subtopic slug required for Home scope tabs.
 *
 * Usage:
 *   npx tsx scripts/migrate/audit-india-subtopic-tag.ts
 *   npx tsx scripts/migrate/audit-india-subtopic-tag.ts --apply
 */
import { createClient } from '@supabase/supabase-js'

const INDIA_SUBTOPIC = 'india'
const INDIA_DOMAIN = 'india-focused'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

async function main() {
  const apply = process.argv.includes('--apply')
  const supabase = getAdminClient()

  const { data: indiaTag, error: tagError } = await supabase
    .from('tags')
    .select('id, slug')
    .eq('slug', INDIA_SUBTOPIC)
    .maybeSingle()

  if (tagError) throw new Error(tagError.message)
  if (!indiaTag) {
    console.error(`Tag slug "${INDIA_SUBTOPIC}" not found — seed taxonomy first.`)
    process.exit(1)
  }

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, tag_slugs, status, content_stream')
    .eq('status', 'published')
    .contains('tag_slugs', [INDIA_DOMAIN])
    .not('tag_slugs', 'cs', `{${INDIA_SUBTOPIC}}`)

  if (error) throw new Error(error.message)

  const rows = articles ?? []
  console.log(
    `Found ${rows.length} published article(s) with "${INDIA_DOMAIN}" but not "${INDIA_SUBTOPIC}".`
  )

  for (const row of rows) {
    console.log(`- ${row.id} [${row.content_stream}] ${row.title}`)
  }

  if (!apply || rows.length === 0) {
    if (!apply && rows.length > 0) {
      console.log('\nRe-run with --apply to add the india subtopic via upsert_article_tags.')
    }
    return
  }

  for (const row of rows) {
    const nextSlugs = [...new Set([...(row.tag_slugs ?? []), INDIA_SUBTOPIC])].sort()
    const { error: rpcError } = await supabase.rpc('upsert_article_tags', {
      p_article_id: row.id,
      p_tag_slugs: nextSlugs,
    })
    if (rpcError) {
      console.error(`Failed ${row.id}: ${rpcError.message}`)
    } else {
      console.log(`Updated ${row.id}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
