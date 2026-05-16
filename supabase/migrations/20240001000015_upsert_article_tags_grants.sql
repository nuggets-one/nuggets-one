-- Ensure upsert_article_tags exists and is callable via PostgREST (S6-F4).
-- Idempotent: safe if 20240001000005 was already applied.

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

GRANT EXECUTE ON FUNCTION public.upsert_article_tags(uuid, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_article_tags(uuid, text[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
