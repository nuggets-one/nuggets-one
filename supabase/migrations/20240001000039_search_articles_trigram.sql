-- Trigram fallback search RPC.
--
-- Called by the app layer ONLY when search_articles_ranked (FTS) returns zero
-- rows on the first page, giving typo/partial tolerance for named entities
-- (e.g. "NCPI" -> "NPCI"). Returns the same columns as search_articles_ranked
-- so the enrich pipeline is shared. Single-page (no cursor) by design.
--
-- Facet params (p_stream/p_tags/p_scope) mirror search_articles_ranked so the
-- fallback honors any narrowing facets the user has applied.

DROP FUNCTION IF EXISTS public.search_articles_trigram(text, text[], text, integer, text);

CREATE OR REPLACE FUNCTION public.search_articles_trigram(
  p_stream text,
  p_tags text[] DEFAULT ARRAY[]::text[],
  p_q text DEFAULT '',
  p_limit integer DEFAULT 24,
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
-- Include `extensions` so pg_trgm's word_similarity()/% resolve regardless of
-- whether the extension is installed in public (CLI) or extensions (hosted).
SET search_path = public, extensions
AS $$
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
    GREATEST(similarity(a.title, trim(p_q)), word_similarity(trim(p_q), a.title))::real AS search_rank
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
      COALESCE(array_length(p_tags, 1), 0) = 0
      OR a.tag_slugs @> p_tags
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
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 24), 50));
$$;

GRANT EXECUTE ON FUNCTION public.search_articles_trigram(text, text[], text, integer, text)
  TO anon;
GRANT EXECUTE ON FUNCTION public.search_articles_trigram(text, text[], text, integer, text)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
