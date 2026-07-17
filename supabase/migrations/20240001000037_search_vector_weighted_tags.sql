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

-- array_to_string() is declared STABLE, so it cannot be used directly inside a
-- GENERATED ALWAYS expression (Postgres requires immutability -> error 42P17
-- "generation expression is not immutable"). For a text[] the join is fully
-- deterministic, so we wrap it in an IMMUTABLE helper. This also folds the
-- hyphen->space normalization in one place ('tech-vc' -> 'tech vc').
CREATE OR REPLACE FUNCTION public.tag_slugs_to_text(p_tags text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT replace(coalesce(array_to_string(p_tags, ' '), ''), '-', ' ');
$$;

DROP INDEX IF EXISTS idx_articles_search;

ALTER TABLE articles DROP COLUMN IF EXISTS search_vector;

ALTER TABLE articles
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', public.tag_slugs_to_text(tag_slugs)), 'C') ||
    setweight(to_tsvector('english', coalesce(content_markdown, '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_articles_search
  ON articles USING gin(search_vector);

NOTIFY pgrst, 'reload schema';
