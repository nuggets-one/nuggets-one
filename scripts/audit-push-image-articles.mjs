/**
 * Audit push delivery for standard/pulse image articles vs others.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnvLocal() {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    const k = t.slice(0, i)
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (process.env[k] == null) process.env[k] = v
  }
}

loadEnvLocal()
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await client.connect()

const recentArticles = await client.query(`
  SELECT id, title, content_stream, hero_media_kind, hero_thumb_url IS NOT NULL AS has_hero,
         left(hero_thumb_url, 80) AS hero_prefix, published_at
  FROM articles
  WHERE status = 'published'
    AND content_stream IN ('standard', 'pulse')
    AND published_at > now() - interval '14 days'
  ORDER BY published_at DESC
  LIMIT 20
`)

const digestArticles = await client.query(`
  SELECT dba.article_id, dba.image_url IS NOT NULL AS has_image, left(dba.image_url, 80) AS img_prefix,
         dba.batch_key, dba.created_at, a.content_stream, a.hero_media_kind
  FROM push_digest_buffer_articles dba
  JOIN articles a ON a.id = dba.article_id
  WHERE a.content_stream IN ('standard', 'pulse')
  ORDER BY dba.created_at DESC
  LIMIT 20
`)

const outbox = await client.query(`
  SELECT pto.id, pto.content_stream, pto.kind, pto.sent_at, pto.last_error, pto.created_at,
         pto.data->>'imageUrl' IS NOT NULL AS has_image_url,
         left(pto.data->>'imageUrl', 80) AS image_prefix,
         a.hero_media_kind
  FROM push_topic_outbox pto
  LEFT JOIN articles a ON a.id = pto.article_id
  WHERE pto.content_stream IN ('standard', 'pulse')
  ORDER BY pto.created_at DESC
  LIMIT 25
`)

const failed = await client.query(`
  SELECT pda.status, pda.error_message, pda.created_at,
         left(pto.data->>'imageUrl', 80) AS image_prefix,
         pto.content_stream, pto.kind
  FROM push_delivery_attempts pda
  JOIN push_topic_outbox pto ON pto.id = pda.outbox_id::uuid
  WHERE pda.status = 'failed'
    AND pto.content_stream IN ('standard', 'pulse')
  ORDER BY pda.created_at DESC
  LIMIT 15
`)

const stuckBuffers = await client.query(`
  SELECT batch_key, content_stream, article_count, interval_hours, updated_at
  FROM push_digest_buffer
  WHERE content_stream IN ('standard', 'pulse')
  ORDER BY updated_at DESC
`)

const pulseImg = await client.query(`
  SELECT a.id, a.title, a.published_at, left(a.hero_thumb_url, 100) AS hero,
         EXISTS (
           SELECT 1 FROM push_topic_outbox pto WHERE pto.article_id = a.id
         ) AS has_outbox
  FROM articles a
  WHERE a.status = 'published'
    AND a.content_stream = 'pulse'
    AND a.hero_media_kind = 'image'
  ORDER BY a.published_at DESC
  LIMIT 15
`)

const imageNoOutbox = await client.query(`
  SELECT a.id, a.content_stream, a.hero_media_kind, a.published_at, a.title,
         left(a.hero_thumb_url, 120) AS hero,
         EXISTS (SELECT 1 FROM user_notifications un WHERE un.article_id = a.id AND un.kind = 'single') AS in_app
  FROM articles a
  WHERE a.status = 'published'
    AND a.hero_media_kind = 'image'
    AND a.content_stream IN ('standard', 'pulse')
    AND a.published_at > now() - interval '30 days'
    AND NOT EXISTS (SELECT 1 FROM push_topic_outbox pto WHERE pto.article_id = a.id)
  ORDER BY a.published_at DESC
  LIMIT 20
`)

const failedAll = await client.query(`
  SELECT pda.error_message, pda.created_at,
         pto.content_stream, pto.data->>'imageUrl' AS image_url, pto.kind
  FROM push_delivery_attempts pda
  JOIN push_topic_outbox pto ON pto.id = pda.outbox_id::uuid
  WHERE pda.status = 'failed'
  ORDER BY pda.created_at DESC
  LIMIT 30
`)

const nullHeroImage = await client.query(`
  SELECT id, content_stream, title, published_at
  FROM articles
  WHERE status = 'published'
    AND hero_media_kind = 'image'
    AND hero_thumb_url IS NULL
    AND content_stream IN ('standard', 'pulse')
  LIMIT 10
`)

console.log(JSON.stringify({
  recentArticles: recentArticles.rows,
  pulseImageArticles: pulseImg.rows,
  imageArticlesMissingOutbox: imageNoOutbox.rows,
  nullHeroImage: nullHeroImage.rows,
  digestArticles: digestArticles.rows,
  outbox: outbox.rows,
  failed: failed.rows,
  failedAll: failedAll.rows,
  stuckBuffers: stuckBuffers.rows,
}, null, 2))

await client.end()
