-- Legacy media hero rectification (Mongo → Postgres)
--
-- Prefer the TypeScript backfill (reads all Mongo field names):
--   npm run backfill:legacy-media -- --dry-run
--   npm run backfill:legacy-media
--   npm run backfill:legacy-media -- --article-id=293468c6-7ee8-4ffe-b611-978977cd8f06
--
-- Flags:
--   --dry-run     log changes only
--   --all         rewrite every article with legacy_mongo_id (default: only wrong heroes)
--   --limit=N     process first N rows
--
-- This SQL file is diagnostic only — use the script for the actual fix.

SELECT id, title, source_url, hero_thumb_url, hero_media_kind
FROM articles
WHERE legacy_mongo_id IS NOT NULL
  AND hero_thumb_url ILIKE '%.pdf'
ORDER BY published_at DESC NULLS LAST
LIMIT 50;
