-- One-time: set articles.hero_* from the first article_media row when hero is missing.
-- Run in Supabase SQL Editor. Safe to re-run (only touches null hero_thumb_url).

UPDATE articles a
SET
  hero_thumb_url = COALESCE(NULLIF(TRIM(m.hero_thumb_url), ''), NULLIF(TRIM(m.url), '')),
  hero_media_kind = CASE WHEN m.kind = 'youtube' THEN 'youtube' ELSE 'image' END,
  hero_video_id = m.video_id,
  hero_media_id = m.id,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (article_id)
    id,
    article_id,
    url,
    hero_thumb_url,
    kind,
    video_id
  FROM article_media
  ORDER BY article_id, sort_order ASC, id ASC
) m
WHERE a.id = m.article_id
  AND a.status = 'published'
  AND a.hero_thumb_url IS NULL
  AND (a.hero_media_kind IS NULL OR a.hero_media_kind <> 'youtube')
  AND COALESCE(NULLIF(TRIM(m.hero_thumb_url), ''), NULLIF(TRIM(m.url), '')) IS NOT NULL;
