-- Run in Supabase SQL Editor after validation overwrote policies with schema.sql names.
-- Removes Phase 6 names and ensures PR-02 policy names for articles + user_notifications.

DROP POLICY IF EXISTS "articles: anon reads published" ON articles;
DROP POLICY IF EXISTS "user_notifications: user owns row" ON user_notifications;

DROP POLICY IF EXISTS "articles: public read published" ON articles;
DROP POLICY IF EXISTS "user_notifications: user reads own" ON user_notifications;

CREATE POLICY "articles: public read published"
  ON articles FOR SELECT
  USING (status = 'published');

CREATE POLICY "user_notifications: user reads own"
  ON user_notifications FOR SELECT
  USING (user_id = auth.uid());
