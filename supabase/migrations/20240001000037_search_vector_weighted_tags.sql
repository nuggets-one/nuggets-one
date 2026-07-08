-- Reweighted search document: fold tag_slugs into search_vector.
--
-- Ranking intent: title (A) > summary/excerpt (B) > tags (C) > body (D).
-- tag_slugs are hyphenated slugs (e.g. 'tech-vc'); we replace hyphens with
-- spaces so 'tech-vc' tokenizes as 'tech' + 'vc' for FTS.
--
-- search_vector remains GENERATED ALWAYS AS STORED (no trigger). Because it is
-- generated from tag_slugs, tag edits auto-refresh the vector. Postgres does not
-- allow ALTERing a generation expression, so we drop + recreate the column and
-- its GIN index. This rewrites the articles table under an ACCESS EXCLUSIVE lock.

DROP INDEX IF EXISTS idx_articles_search;

ALTER TABLE articles DROP COLUMN IF EXISTS search_vector;

ALTER TABLE articles
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(
      to_tsvector('english', coalesce(replace(array_to_string(tag_slugs, ' '), '-', ' '), '')),
      'C'
    ) ||
    setweight(to_tsvector('english', coalesce(content_markdown, '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_articles_search
  ON articles USING gin(search_vector);

NOTIFY pgrst, 'reload schema';
