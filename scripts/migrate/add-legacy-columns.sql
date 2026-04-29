-- PR-15 Step 9 — Add legacy_mongo_id columns and any missing ETL columns
-- Run in Supabase SQL editor before the first live ETL pass.

-- Check which columns exist before running:
-- SELECT table_name, column_name FROM information_schema.columns
-- WHERE table_name IN ('articles','tags','community_collections')
--   AND column_name IN ('legacy_mongo_id','source_url')
-- ORDER BY table_name, column_name;

-- articles: legacy_mongo_id for redirect lookups; source_url for attribution
ALTER TABLE articles ADD COLUMN IF NOT EXISTS legacy_mongo_id text UNIQUE;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_url text;

-- tags: legacy_mongo_id for traceability
ALTER TABLE tags ADD COLUMN IF NOT EXISTS legacy_mongo_id text UNIQUE;

-- community_collections: legacy_mongo_id for entry resolution
ALTER TABLE community_collections ADD COLUMN IF NOT EXISTS legacy_mongo_id text UNIQUE;

-- Optional: migration_log for deduped/discarded tag IDs (Migration Plan §3.3)
-- RLS ON, no policies: blocks anon/authenticated via PostgREST; service_role (ETL) still works.
CREATE TABLE IF NOT EXISTS migration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  mongo_id text NOT NULL,
  reason text,
  logged_at timestamptz DEFAULT now()
);
ALTER TABLE migration_log ENABLE ROW LEVEL SECURITY;
