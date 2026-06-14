import * as path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pg from 'pg'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
dotenv.config({ path: path.join(ROOT, '.env.local') })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()
try {
  const { rows } = await client.query(`
    SELECT slug, label, dimension, is_official
    FROM tags
    WHERE slug IN ('goldman-sachs', 'bloomberg', 'jpmorgan')
    ORDER BY slug
  `)
  console.log('chart provider tags:', rows)
} finally {
  client.release()
  await pool.end()
}
