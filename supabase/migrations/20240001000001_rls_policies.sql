-- PR-02b: row level security (policies only). Depends on 20240001000000_initial_schema.sql.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "articles: public read published"
  ON articles FOR SELECT
  USING (status = 'published');

CREATE POLICY "profiles: user owns row"
  ON profiles FOR ALL
  USING (id = auth.uid());

CREATE POLICY "bookmarks: user owns row"
  ON bookmarks FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "notification_preferences: user owns row"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "user_notifications: user reads own"
  ON user_notifications FOR SELECT
  USING (user_id = auth.uid());

-- tags: public read (no RLS — no user data)
COMMENT ON TABLE tags IS
  'Public read by design; no RLS. Official chip rail uses is_official = true.';

-- community_collections: public read (fully public list/detail)
COMMENT ON TABLE community_collections IS
  'Public read by design; no RLS. Collections are anonymous-accessible per blueprint §6.4.';

-- article_tags: join table; visibility follows articles when queried via joins
COMMENT ON TABLE article_tags IS
  'No RLS; combine with articles policies via joins (published rows only for anon reads).';

-- article_media: gallery rows; no user-owned columns at row level PMF
COMMENT ON TABLE article_media IS
  'Public read by design; no RLS. Feed/card imagery uses denormalized hero_* on articles.';
