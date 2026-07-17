-- Search relevance: prefix + OR-relaxed + typo-tolerant matching.
--
-- Root cause of "no results" for reasonable queries: the RPCs matched with
-- websearch_to_tsquery, which (a) only matches complete stemmed words (no
-- prefix while typing) and (b) ANDs every term (one non-matching word in a
-- pasted title -> zero results). This migration rewrites both search RPCs to
-- match on an OR-of-prefixed terms query plus a trigram similarity fallback,
-- while ranking so exact/complete matches still float to the top.
--
-- Depends on:
--   037 -> reweighted search_vector (title A > excerpt B > tags C > body D)
--   038 -> pg_trgm + idx_articles_title_trgm
-- Signatures are unchanged so the app layer needs no changes.

-- ---------------------------------------------------------------------------
-- Helper: turn a raw user query into an OR-of-prefixed, sanitized tsquery.
-- e.g. "Minimum Viable" -> to_tsquery('english', 'minimum:* | viable:*')
-- Returns NULL for empty/too-short input (callers treat NULL as "no FTS match").
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_prefix_tsquery(p_q text)
RETURNS tsquery
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN agg.q IS NULL OR agg.q = '' THEN NULL::tsquery
    ELSE to_tsquery('english', agg.q)
  END
  FROM (
    SELECT string_agg(term || ':*', ' | ') AS q
    FROM (
      SELECT regexp_replace(t, '[^a-z0-9]', '', 'g') AS term
      FROM unnest(regexp_split_to_array(lower(coalesce(p_q, '')), '\s+')) AS t
    ) tokens
    WHERE term <> '' AND length(term) >= 2
  ) agg;
$$;

GRANT EXECUTE ON FUNCTION public.search_prefix_tsquery(text) TO anon;
GRANT EXECUTE ON FUNCTION public.search_prefix_tsquery(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Committed full-page search.
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
-- extensions: pg_trgm (%, word_similarity) may live outside public on Supabase.
SET search_path = public, extensions
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
      + word_similarity(query.q_text, a.title)
    )::real AS search_rank
  FROM public.articles a
  CROSS JOIN query
  WHERE
    a.status = 'published'
    AND (
      p_stream = 'all'
      OR a.visible_streams @> ARRAY[p_stream]::text[]
    )
    AND (
      a.search_vector @@ query.tsq_prefix
      OR a.title % query.q_text
    )
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
-- Live suggestions (search-as-you-type). Prefix + trigram so partial words and
-- typos surface immediately; ranked so the best title match is first.
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
SET search_path = public, extensions
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
  AND (
    p_stream = 'all'
    OR a.visible_streams @> ARRAY[p_stream]::text[]
  )
  AND (
    a.search_vector @@ query.tsq_prefix
    OR a.title % query.q_text
  )
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
    + word_similarity(query.q_text, a.title)
  ) DESC,
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

NOTIFY pgrst, 'reload schema';
