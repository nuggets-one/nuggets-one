-- PostgREST .upsert(onConflict: 'user_id,article_id') requires a non-partial unique
-- index on those columns. The partial index ux_user_notifications_user_article_single
-- is not accepted for ON CONFLICT inference (Postgres 42P10).

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_notifications_user_article_id
  ON user_notifications (user_id, article_id);
