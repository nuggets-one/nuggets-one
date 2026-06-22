-- Multi-stream feed visibility: denormalized visible_streams[] recomputed from
-- content_stream (primary) + tag-gated stream rules. One row per article.

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS visible_streams text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_articles_visible_streams
  ON articles USING gin(visible_streams);

-- Per-stream keyset indexes aligned with feed pagination
CREATE INDEX IF NOT EXISTS idx_articles_feed_standard_visible
  ON articles (published_at DESC, id DESC)
  WHERE status = 'published'
    AND visible_streams @> ARRAY['standard']::text[];

CREATE INDEX IF NOT EXISTS idx_articles_feed_pulse_visible
  ON articles (published_at DESC, id DESC)
  WHERE status = 'published'
    AND visible_streams @> ARRAY['pulse']::text[];

CREATE INDEX IF NOT EXISTS idx_articles_feed_charts_visible
  ON articles (published_at DESC, id DESC)
  WHERE status = 'published'
    AND visible_streams @> ARRAY['charts']::text[];

CREATE INDEX IF NOT EXISTS idx_articles_feed_tech_vc_visible
  ON articles (published_at DESC, id DESC)
  WHERE status = 'published'
    AND visible_streams @> ARRAY['tech_vc']::text[];

CREATE INDEX IF NOT EXISTS idx_articles_feed_geopolitics_visible
  ON articles (published_at DESC, id DESC)
  WHERE status = 'published'
    AND visible_streams @> ARRAY['geopolitics']::text[];

CREATE INDEX IF NOT EXISTS idx_articles_feed_leadership_visible
  ON articles (published_at DESC, id DESC)
  WHERE status = 'published'
    AND visible_streams @> ARRAY['leadership']::text[];

CREATE OR REPLACE FUNCTION recompute_visible_streams(p_article_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_content_stream text;
  v_tag_slugs text[];
  v_streams text[] := '{}';
BEGIN
  SELECT content_stream, tag_slugs
  INTO v_content_stream, v_tag_slugs
  FROM articles
  WHERE id = p_article_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_streams := ARRAY[v_content_stream];

  IF v_tag_slugs @> ARRAY['geopolitics']::text[] THEN
    v_streams := array_append(v_streams, 'geopolitics');
  END IF;

  IF v_tag_slugs && ARRAY['technology', 'pe-vc', 'ai', 'semiconductors']::text[] THEN
    v_streams := array_append(v_streams, 'tech_vc');
  END IF;

  IF v_tag_slugs @> ARRAY['leaders-investors-entrepreneurs']::text[] THEN
    v_streams := array_append(v_streams, 'leadership');
  END IF;

  UPDATE articles
  SET visible_streams = (
    SELECT COALESCE(array_agg(stream ORDER BY ord), '{}')
    FROM (
      SELECT stream, ord
      FROM unnest(ARRAY[
        'standard'::text,
        'pulse',
        'charts',
        'tech_vc',
        'geopolitics',
        'leadership'
      ]) WITH ORDINALITY AS t(stream, ord)
      WHERE stream = ANY(v_streams)
    ) ordered
  )
  WHERE id = p_article_id;
END;
$$;

CREATE OR REPLACE FUNCTION trg_recompute_visible_streams()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM recompute_visible_streams(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_recompute_visible_streams ON articles;

CREATE TRIGGER articles_recompute_visible_streams
  AFTER INSERT OR UPDATE OF content_stream, tag_slugs
  ON articles
  FOR EACH ROW
  EXECUTE FUNCTION trg_recompute_visible_streams();

-- Backfill existing rows
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM articles LOOP
    PERFORM recompute_visible_streams(r.id);
  END LOOP;
END;
$$;

-- Ensure upsert_article_tags keeps visible_streams in sync (trigger fires on tag_slugs update)
CREATE OR REPLACE FUNCTION upsert_article_tags(
  p_article_id uuid,
  p_tag_slugs   text[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  missing_count integer;
BEGIN
  SELECT COUNT(*)
  INTO missing_count
  FROM UNNEST(p_tag_slugs) AS s
  WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = s);

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'unknown_tag_slugs'
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM article_tags WHERE article_id = p_article_id;

  INSERT INTO article_tags (article_id, tag_id)
  SELECT DISTINCT p_article_id, t.id
  FROM UNNEST(p_tag_slugs) AS s
  JOIN tags t ON t.slug = s;

  UPDATE articles
  SET tag_slugs = ARRAY(
    SELECT t.slug
    FROM article_tags at2
    JOIN tags t ON t.id = at2.tag_id
    WHERE at2.article_id = p_article_id
    ORDER BY t.slug
  )
  WHERE id = p_article_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_visible_streams(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_article_tags(uuid, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_article_tags(uuid, text[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
