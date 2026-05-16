-- Fix publish fan-out: PostgREST upsert needs a non-partial unique index on (user_id, article_id).
-- Run in Supabase SQL Editor if publish still shows fanout_failed after app deploy.

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_notifications_user_article_id
  ON user_notifications (user_id, article_id);
