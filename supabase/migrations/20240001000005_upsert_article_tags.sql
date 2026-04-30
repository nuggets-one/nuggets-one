-- S6-F4: Transactional tag source-of-truth.
-- article_tags is canonical; articles.tag_slugs is derived and recomputed here.
-- Admin CLAUDE.md §slug-recompute freezes the exact SQL for tag_slugs derivation.

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
  -- Reject any slug that has no corresponding row in tags table
  SELECT COUNT(*)
  INTO missing_count
  FROM UNNEST(p_tag_slugs) AS s
  WHERE NOT EXISTS (SELECT 1 FROM tags WHERE slug = s);

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'unknown_tag_slugs'
      USING ERRCODE = 'P0001';
  END IF;

  -- Atomically replace all tag associations for this article
  DELETE FROM article_tags WHERE article_id = p_article_id;

  -- DISTINCT prevents duplicate (article_id, tag_id) if caller passes duplicate slugs
  INSERT INTO article_tags (article_id, tag_id)
  SELECT DISTINCT p_article_id, t.id
  FROM UNNEST(p_tag_slugs) AS s
  JOIN tags t ON t.slug = s;

  -- Recompute denormalized array from join table (exact SQL frozen in admin CLAUDE.md)
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
