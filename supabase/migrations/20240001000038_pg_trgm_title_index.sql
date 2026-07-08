-- Trigram support for typo/partial matching fallback.
--
-- pg_trgm powers a similarity() fallback used only when websearch_to_tsquery
-- returns zero rows on the first page (see search_articles_trigram in the next
-- migration). The GIN trgm index keeps that fallback indexed rather than a scan.
--
-- On hosted Supabase, pg_trgm installs into the `extensions` schema; on a bare
-- Postgres/CLI it may land in `public`. Keeping both on the search_path lets the
-- gin_trgm_ops operator class resolve regardless of where the extension lives.
-- (Non-existent schemas in search_path are ignored, so this is safe everywhere.)

SET search_path = public, extensions;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_articles_title_trgm
  ON articles USING gin (title gin_trgm_ops);

NOTIFY pgrst, 'reload schema';
