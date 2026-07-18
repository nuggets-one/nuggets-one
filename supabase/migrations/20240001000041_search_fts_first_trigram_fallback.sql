-- Search: FTS-first hot path; trigram is fallback-only.
--
-- Migration 040 blended `title % q` into every ranked/suggest match (OR with
-- prefix FTS). That violated the project rule that pg_trgm is a fallback only
-- when FTS returns zero rows, and under PostgREST statement timeouts it caused
-- intermittent empty suggestions for common queries.
--
-- This migration:
--   1. Rewrites search_articles_ranked / search_suggestions_ranked to match
--      only on search_vector @@ search_prefix_tsquery(q).
--   2. Ranks with strict websearch + prefix ts_rank_cd (no word_similarity).
--   3. Adds search_suggestions_trigram for the suggest-path app fallback
--      (mirrors search_articles_trigram used by committed search).
--
-- Depends on: 038 (pg_trgm), 039 (search_articles_trigram), 040 (prefix helper).

-- ---------------------------------------------------------------------------
-- Committed full-page search — FTS prefix only.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.search_articles_ranked(text, text[], text, integer, real, timestamptz, uuid, text);

CREATE OR REPLACE FUNCTION public.search_articles_ranked(
  p_stream text,
  p_tags text[] DEFAULT ARRAY[]::text[],
  p_q text DEFAULT '',
  p_limit integer DEFAULT 24,
  p_cursor_rank real DEFAULT NULL,
  p_cursor_published_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_scope text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  card_preview text,
  content_stream text,
  published_at timestamptz,
  hero_thumb_url text,
  hero_alt_text text,
  hero_media_kind text,
  hero_video_id text,
  tag_slugs text[],
  source_url text,
  curator_display_name text,
  search_rank real
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
WITH query AS (
  SELECT
    trim(p_q) AS q_text,
    websearch_to_tsquery('english', trim(p_q)) AS tsq_strict,
    public.search_prefix_tsquery(p_q) AS tsq_prefix
),
scored AS (
  SELECT
    a.id,
    a.slug,
    a.title,
    a.card_preview,
    a.content_stream,
    a.published_at,
    a.hero_thumb_url,
    a.hero_alt_text,
    a.hero_media_kind,
    a.hero_video_id,
    a.tag_slugs,
    a.source_url,
    a.curator_display_name,
    (
      4 * COALESCE(ts_rank_cd(a.search_vector, query.tsq_strict, 32), 0)
      + COALESCE(ts_rank_cd(a.search_vector, query.tsq_prefix, 32), 0)
    )::real AS search_rank
  FROM public.articles a
  CROSS JOIN query
  WHERE
    a.status = 'published'
    AND query.tsq_prefix IS NOT NULL
    AND (
      p_stream = 'all'
      OR a.visible_streams @> ARRAY[p_stream]::text[]
    )
    AND a.search_vector @@ query.tsq_prefix
    AND (
      COALESCE(array_length(p_tags, 1), 0) = 0
      OR a.tag_slugs @> p_tags
    )
    AND (
      p_scope IS NULL
      OR p_scope NOT IN ('global', 'india')
      OR (p_scope = 'global' AND NOT (a.tag_slugs @> ARRAY['india']::text[]))
      OR (p_scope = 'india' AND a.tag_slugs @> ARRAY['india']::text[])
    )
)
SELECT
  scored.id,
  scored.slug,
  scored.title,
  scored.card_preview,
  scored.content_stream,
  scored.published_at,
  scored.hero_thumb_url,
  scored.hero_alt_text,
  scored.hero_media_kind,
  scored.hero_video_id,
  scored.tag_slugs,
  scored.source_url,
  scored.curator_display_name,
  scored.search_rank
FROM scored
WHERE
  p_cursor_rank IS NULL
  OR scored.search_rank < p_cursor_rank
  OR (
    scored.search_rank = p_cursor_rank
    AND (
      scored.published_at < p_cursor_published_at
      OR (
        scored.published_at = p_cursor_published_at
        AND scored.id < p_cursor_id
      )
    )
  )
ORDER BY scored.search_rank DESC, scored.published_at DESC, scored.id DESC
LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 24), 50));
$$;

-- ---------------------------------------------------------------------------
-- Live suggestions — FTS prefix only (trigram via search_suggestions_trigram).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.search_suggestions_ranked(text, text, integer, text);

CREATE OR REPLACE FUNCTION public.search_suggestions_ranked(
  p_stream text,
  p_q text DEFAULT '',
  p_limit integer DEFAULT 8,
  p_scope text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  content_stream text,
  published_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
WITH query AS (
  SELECT
    trim(p_q) AS q_text,
    websearch_to_tsquery('english', trim(p_q)) AS tsq_strict,
    public.search_prefix_tsquery(p_q) AS tsq_prefix
)
SELECT
  a.id,
  a.slug,
  a.title,
  a.content_stream,
  a.published_at
FROM public.articles a
CROSS JOIN query
WHERE
  a.status = 'published'
  AND query.tsq_prefix IS NOT NULL
  AND (
    p_stream = 'all'
    OR a.visible_streams @> ARRAY[p_stream]::text[]
  )
  AND a.search_vector @@ query.tsq_prefix
  AND (
    p_scope IS NULL
    OR p_scope NOT IN ('global', 'india')
    OR (p_scope = 'global' AND NOT (a.tag_slugs @> ARRAY['india']::text[]))
    OR (p_scope = 'india' AND a.tag_slugs @> ARRAY['india']::text[])
  )
ORDER BY
  (
    4 * COALESCE(ts_rank_cd(a.search_vector, query.tsq_strict, 32), 0)
    + COALESCE(ts_rank_cd(a.search_vector, query.tsq_prefix, 32), 0)
  ) DESC,
  a.published_at DESC,
  a.id DESC
LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 8), 8));
$$;

-- ---------------------------------------------------------------------------
-- Suggest-path trigram fallback (app layer only when FTS returns zero / errors).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.search_suggestions_trigram(text, text, integer, text);

CREATE OR REPLACE FUNCTION public.search_suggestions_trigram(
  p_stream text,
  p_q text DEFAULT '',
  p_limit integer DEFAULT 8,
  p_scope text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  content_stream text,
  published_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    a.id,
    a.slug,
    a.title,
    a.content_stream,
    a.published_at
  FROM public.articles a
  WHERE
    a.status = 'published'
    AND length(trim(p_q)) >= 2
    AND (
      p_stream = 'all'
      OR a.visible_streams @> ARRAY[p_stream]::text[]
    )
    AND (
      a.title % trim(p_q)
      OR trim(p_q) <% a.title
    )
    AND (
      p_scope IS NULL
      OR p_scope NOT IN ('global', 'india')
      OR (p_scope = 'global' AND NOT (a.tag_slugs @> ARRAY['india']::text[]))
      OR (p_scope = 'india' AND a.tag_slugs @> ARRAY['india']::text[])
    )
  ORDER BY
    GREATEST(similarity(a.title, trim(p_q)), word_similarity(trim(p_q), a.title)) DESC,
    a.published_at DESC,
    a.id DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 8), 8));
$$;

GRANT EXECUTE ON FUNCTION public.search_articles_ranked(text, text[], text, integer, real, timestamptz, uuid, text)
  TO anon;
GRANT EXECUTE ON FUNCTION public.search_articles_ranked(text, text[], text, integer, real, timestamptz, uuid, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_suggestions_ranked(text, text, integer, text)
  TO anon;
GRANT EXECUTE ON FUNCTION public.search_suggestions_ranked(text, text, integer, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_suggestions_trigram(text, text, integer, text)
  TO anon;
GRANT EXECUTE ON FUNCTION public.search_suggestions_trigram(text, text, integer, text)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
