-- Relevance-first search helpers for homepage search and suggestions.
-- Align committed-search + suggest ordering with weighted FTS rank and
-- support cursor-compatible pagination on search results.

CREATE OR REPLACE FUNCTION public.search_articles_ranked(
  p_stream text,
  p_tags text[] DEFAULT ARRAY[]::text[],
  p_q text DEFAULT '',
  p_limit integer DEFAULT 24,
  p_cursor_rank real DEFAULT NULL,
  p_cursor_published_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
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
  SELECT websearch_to_tsquery('english', trim(p_q)) AS tsq
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
    ts_rank_cd(a.search_vector, query.tsq, 32) AS search_rank
  FROM public.articles a
  CROSS JOIN query
  WHERE
    a.status = 'published'
    AND a.content_stream = p_stream
    AND a.search_vector @@ query.tsq
    AND (
      COALESCE(array_length(p_tags, 1), 0) = 0
      OR a.tag_slugs @> p_tags
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

CREATE OR REPLACE FUNCTION public.search_suggestions_ranked(
  p_stream text,
  p_q text DEFAULT '',
  p_limit integer DEFAULT 8
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
  SELECT websearch_to_tsquery('english', trim(p_q)) AS tsq
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
  AND a.content_stream = p_stream
  AND a.search_vector @@ query.tsq
ORDER BY
  ts_rank_cd(a.search_vector, query.tsq, 32) DESC,
  a.published_at DESC,
  a.id DESC
LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 8), 8));
$$;

GRANT EXECUTE ON FUNCTION public.search_articles_ranked(text, text[], text, integer, real, timestamptz, uuid)
  TO anon;
GRANT EXECUTE ON FUNCTION public.search_articles_ranked(text, text[], text, integer, real, timestamptz, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_suggestions_ranked(text, text, integer)
  TO anon;
GRANT EXECUTE ON FUNCTION public.search_suggestions_ranked(text, text, integer)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
