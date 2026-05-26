/**
 * Postgres migration readiness snapshot for collections ETL.
 * Run: npx tsx scripts/migrate/inspect-postgres-state.ts
 */
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')

dotenv.config({ path: path.join(ROOT, '.env.local'), override: false })

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('Missing DATABASE_URL')

  const pool = new pg.Pool({ connectionString: databaseUrl })
  try {
    const count = async (sql: string) => {
      const r = await pool.query(sql)
      return r.rows[0]?.c ?? 0
    }

    console.log('\nPostgres snapshot:')
    console.log('  articles:', await count('select count(*)::int as c from articles'))
    console.log(
      '  articles (legacy_mongo_id set):',
      await count('select count(*)::int as c from articles where legacy_mongo_id is not null')
    )
    console.log('  tags:', await count('select count(*)::int as c from tags'))
    console.log(
      '  community_collections:',
      await count('select count(*)::int as c from community_collections')
    )
    console.log(
      '  community_collection_entries:',
      await count('select count(*)::int as c from community_collection_entries')
    )
    console.log(
      '  published collections:',
      await count("select count(*)::int as c from community_collections where status = 'published'")
    )

    const cols = await pool.query(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'community_collections'
       order by ordinal_position`
    )
    console.log(
      '  community_collections columns:',
      cols.rows.map((r) => r.column_name).join(', ')
    )
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
