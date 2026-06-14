-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION seed_profile_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_profile_on_signup() TO supabase_auth_admin;
GRANT INSERT ON public.profiles TO supabase_auth_admin;

DROP TRIGGER IF EXISTS trg_seed_profile ON auth.users;
CREATE TRIGGER trg_seed_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION seed_profile_on_signup();

INSERT INTO profiles (id) SELECT id FROM auth.users ON CONFLICT DO NOTHING;

-- tags
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label text NOT NULL,
  dimension text CHECK (dimension IS NULL OR dimension IN 
    ('format','domain','subtopic','source')),
  is_official boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- articles
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text,
  content_markdown text,
  content_stream text NOT NULL DEFAULT 'standard'
    CHECK (content_stream IN ('standard','pulse','charts')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published')),
  published_at timestamptz,
  hero_thumb_url text,
  hero_alt_text text,
  hero_media_kind text CHECK (hero_media_kind IS NULL OR 
    hero_media_kind IN ('image','youtube')),
  hero_video_id text,
  hero_media_id uuid,
  tag_slugs text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  curator_display_name text,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content_markdown, '')), 'C')
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION articles_freeze_published_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.published_at IS NOT NULL
     AND NEW.published_at IS DISTINCT FROM OLD.published_at THEN
    NEW.published_at := OLD.published_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_articles_freeze_published_at ON articles;
CREATE TRIGGER trg_articles_freeze_published_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION articles_freeze_published_at();

-- article_tags
CREATE TABLE IF NOT EXISTS article_tags (
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- article_media
CREATE TABLE IF NOT EXISTS article_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('image','youtube')),
  url text NOT NULL,
  video_id text,
  sort_order integer NOT NULL DEFAULT 0,
  origin text NOT NULL DEFAULT 'manual'
    CHECK (origin IN ('manual','inline')),
  created_at timestamptz DEFAULT now()
);

-- bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);

-- notification_preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mute_all boolean NOT NULL DEFAULT false,
  stream_standard boolean NOT NULL DEFAULT true,
  stream_pulse boolean NOT NULL DEFAULT true,
  stream_charts boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- user_notifications
CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('single','digest')),
  content_stream text CHECK (content_stream IS NULL OR 
    content_stream IN ('standard','pulse','charts')),
  title text,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  batch_key text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- community_collections
CREATE TABLE IF NOT EXISTS community_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  curator_name text,
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- community_collection_entries
CREATE TABLE IF NOT EXISTS community_collection_entries (
  collection_id uuid NOT NULL REFERENCES
    community_collections(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, article_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_feed_standard
  ON articles (published_at DESC, id DESC)
  WHERE status = 'published' AND content_stream = 'standard';

CREATE INDEX IF NOT EXISTS idx_articles_feed_pulse
  ON articles (published_at DESC, id DESC)
  WHERE status = 'published' AND content_stream = 'pulse';

CREATE INDEX IF NOT EXISTS idx_articles_feed_charts
  ON articles (published_at DESC, id DESC)
  WHERE status = 'published' AND content_stream = 'charts';

CREATE INDEX IF NOT EXISTS idx_articles_search_vector
  ON articles USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_articles_tag_slugs
  ON articles USING gin(tag_slugs);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_standard
  ON notification_preferences (user_id)
  WHERE mute_all = false AND stream_standard = true;

CREATE INDEX IF NOT EXISTS idx_notification_prefs_pulse
  ON notification_preferences (user_id)
  WHERE mute_all = false AND stream_pulse = true;

CREATE INDEX IF NOT EXISTS idx_notification_prefs_charts
  ON notification_preferences (user_id)
  WHERE mute_all = false AND stream_charts = true;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_notifications_user_article_single
  ON user_notifications (user_id, article_id)
  WHERE kind = 'single' AND article_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_inbox
  ON user_notifications (user_id, created_at DESC)
  WHERE is_read = false;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: user owns row" ON profiles;
DROP POLICY IF EXISTS "profiles: public read published curators" ON profiles;
DROP POLICY IF EXISTS "articles: anon reads published" ON articles;
DROP POLICY IF EXISTS "bookmarks: user owns row" ON bookmarks;
DROP POLICY IF EXISTS "notification_preferences: user owns row" ON notification_preferences;
DROP POLICY IF EXISTS "user_notifications: user owns row" ON user_notifications;

CREATE POLICY "profiles: user owns row"
  ON profiles FOR ALL USING (id = auth.uid());

CREATE POLICY "profiles: public read published curators"
  ON profiles FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM articles a
      WHERE a.created_by = profiles.id
        AND a.status = 'published'
    )
  );

CREATE POLICY "articles: anon reads published"
  ON articles FOR SELECT USING (status = 'published');

CREATE POLICY "bookmarks: user owns row"
  ON bookmarks FOR ALL USING (user_id = auth.uid());

CREATE POLICY "notification_preferences: user owns row"
  ON notification_preferences FOR ALL USING (user_id = auth.uid());

CREATE POLICY "user_notifications: user owns row"
  ON user_notifications FOR SELECT USING (user_id = auth.uid());
