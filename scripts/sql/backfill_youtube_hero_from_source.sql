-- One-time fix: articles with a YouTube source_url but image hero / youtu.be thumb.
-- Run in Supabase SQL Editor after deploy.

UPDATE articles a
SET
  hero_video_id = (regexp_match(a.source_url, 'youtu\.be/([a-zA-Z0-9_-]{11})'))[1],
  hero_media_kind = 'youtube',
  hero_thumb_url = 'https://i.ytimg.com/vi/' || (regexp_match(a.source_url, 'youtu\.be/([a-zA-Z0-9_-]{11})'))[1] || '/hqdefault.jpg'
WHERE a.source_url ~ 'youtu\.be/[a-zA-Z0-9_-]{11}'
  AND (a.hero_video_id IS NULL OR a.hero_media_kind IS DISTINCT FROM 'youtube');

UPDATE articles a
SET
  hero_video_id = (regexp_match(a.source_url, '[?&]v=([a-zA-Z0-9_-]{11})'))[1],
  hero_media_kind = 'youtube',
  hero_thumb_url = 'https://i.ytimg.com/vi/' || (regexp_match(a.source_url, '[?&]v=([a-zA-Z0-9_-]{11})'))[1] || '/hqdefault.jpg'
WHERE a.source_url ~ '[?&]v=[a-zA-Z0-9_-]{11}'
  AND (a.hero_video_id IS NULL OR a.hero_media_kind IS DISTINCT FROM 'youtube');

UPDATE articles a
SET
  hero_video_id = (regexp_match(a.source_url, 'youtube\.com/live/([a-zA-Z0-9_-]{11})'))[1],
  hero_media_kind = 'youtube',
  hero_thumb_url = 'https://i.ytimg.com/vi/' || (regexp_match(a.source_url, 'youtube\.com/live/([a-zA-Z0-9_-]{11})'))[1] || '/hqdefault.jpg'
WHERE a.source_url ~ 'youtube\.com/live/[a-zA-Z0-9_-]{11}'
  AND (a.hero_video_id IS NULL OR a.hero_media_kind IS DISTINCT FROM 'youtube');
