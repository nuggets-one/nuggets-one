-- Phase 6 validation policy names (drop before applying PR-02 migrations on staging)
DROP POLICY IF EXISTS "articles: anon reads published" ON articles;
DROP POLICY IF EXISTS "user_notifications: user owns row" ON user_notifications;
DROP POLICY IF EXISTS "profiles: user owns row" ON profiles;
DROP POLICY IF EXISTS "bookmarks: user owns row" ON bookmarks;
DROP POLICY IF EXISTS "notification_preferences: user owns row"
  ON notification_preferences;

-- PR-02 migration policy names (for clean reruns / teardown after apply)
DROP POLICY IF EXISTS "articles: public read published" ON articles;
DROP POLICY IF EXISTS "profiles: user owns row" ON profiles;
DROP POLICY IF EXISTS "bookmarks: user owns row" ON bookmarks;
DROP POLICY IF EXISTS "notification_preferences: user owns row"
  ON notification_preferences;
DROP POLICY IF EXISTS "user_notifications: user reads own"
  ON user_notifications;
