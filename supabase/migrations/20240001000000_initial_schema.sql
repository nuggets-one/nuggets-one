-- PR-02: initial schema (DDL, triggers, indexes). See NUGGETS_V2_BLUEPRINT.md §12–§13.

-- =============================================================================
-- SECTION 1 — profiles
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION seed_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
  FOR EACH ROW
  EXECUTE FUNCTION seed_profile_on_signup();

INSERT INTO profiles (id) SELECT id FROM auth.users ON CONFLICT DO NOTHING;

-- =============================================================================
-- SECTION 2 — tags
-- =============================================================================

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label text NOT NULL,
  dimension text CHECK (
    dimension IS NULL OR dimension IN ('format', 'domain', 'subtopic')
  ),
  is_official boolean NOT NULL DEFAULT false,
  legacy_mongo_id text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- SECTION 3 — articles
-- =============================================================================

CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text,
  content_markdown text,
  source_url text,
  content_stream text NOT NULL DEFAULT 'standard'
    CHECK (content_stream IN ('standard', 'pulse')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  hero_thumb_url text,
  hero_alt_text text,
  hero_media_kind text CHECK (
    hero_media_kind IS NULL OR hero_media_kind IN ('image', 'youtube')
  ),
  hero_video_id text,
  hero_media_id uuid,
  tag_slugs text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  legacy_mongo_id text UNIQUE,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content_markdown, '')), 'C')
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION articles_freeze_published_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
  FOR EACH ROW
  EXECUTE FUNCTION articles_freeze_published_at();

-- =============================================================================
-- SECTION 4 — article_tags
-- =============================================================================

CREATE TABLE IF NOT EXISTS article_tags (
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- =============================================================================
-- SECTION 5 — article_media
-- =============================================================================

CREATE TABLE IF NOT EXISTS article_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('image', 'youtube')),
  url text NOT NULL,
  video_id text,
  sort_order integer NOT NULL DEFAULT 0,
  hero_thumb_url text,
  origin text NOT NULL DEFAULT 'manual'
    CHECK (origin IN ('manual', 'inline')),
  legacy_mongo_id text UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE articles DROP CONSTRAINT IF EXISTS fk_articles_hero_media;
ALTER TABLE articles
  ADD CONSTRAINT fk_articles_hero_media
  FOREIGN KEY (hero_media_id)
  REFERENCES article_media(id)
  ON DELETE SET NULL;

-- =============================================================================
-- SECTION 6 — bookmarks
-- =============================================================================

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);

-- =============================================================================
-- SECTION 7 — notification_preferences
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mute_all boolean NOT NULL DEFAULT false,
  stream_standard boolean NOT NULL DEFAULT true,
  stream_pulse boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- SECTION 8 — user_notifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('single', 'digest')),
  content_stream text CHECK (
    content_stream IS NULL OR content_stream IN ('standard', 'pulse')
  ),
  title text,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  batch_key text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- SECTION 9 — community_collections
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  curator_name text,
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  legacy_mongo_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- SECTION 10 — community_collection_entries
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_collection_entries (
  collection_id uuid NOT NULL
    REFERENCES community_collections(id) ON DELETE CASCADE,
  article_id uuid NOT NULL
    REFERENCES articles(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, article_id)
);

-- Existing Phase 6 DBs: CREATE TABLE IF NOT EXISTS did not add new columns — patch forward.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS hero_alt_text text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS hero_media_kind text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS hero_video_id text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS legacy_mongo_id text;

DO $$
BEGIN
  ALTER TABLE articles ADD CONSTRAINT articles_hero_media_kind_check CHECK (
    hero_media_kind IS NULL OR hero_media_kind IN ('image', 'youtube')
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE tags ADD COLUMN IF NOT EXISTS legacy_mongo_id text;

ALTER TABLE article_media ADD COLUMN IF NOT EXISTS video_id text;
ALTER TABLE article_media ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE article_media ADD COLUMN IF NOT EXISTS hero_thumb_url text;
ALTER TABLE article_media ADD COLUMN IF NOT EXISTS legacy_mongo_id text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'article_media'
      AND column_name = 'position'
  ) THEN
    UPDATE article_media SET sort_order = article_media."position";
    ALTER TABLE article_media DROP COLUMN IF EXISTS position;
  END IF;
END $$;

ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS content_stream text;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_content_stream_check CHECK (
    content_stream IS NULL OR content_stream IN ('standard', 'pulse')
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE community_collections ADD COLUMN IF NOT EXISTS legacy_mongo_id text;
ALTER TABLE community_collections ADD COLUMN IF NOT EXISTS cover_image_url text;

-- =============================================================================
-- SECTION 11 — INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_articles_feed_standard
  ON articles (published_at DESC, id DESC)
  WHERE status = 'published' AND content_stream = 'standard';

CREATE INDEX IF NOT EXISTS idx_articles_feed_pulse
  ON articles (published_at DESC, id DESC)
  WHERE status = 'published' AND content_stream = 'pulse';

CREATE INDEX IF NOT EXISTS idx_articles_search
  ON articles USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_articles_tag_slugs
  ON articles USING gin(tag_slugs);

DROP INDEX IF EXISTS idx_user_notifications_inbox;
CREATE INDEX IF NOT EXISTS idx_user_notifications_inbox
  ON user_notifications (user_id, created_at DESC)
  WHERE is_read = false;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_notifications_user_batch_key
  ON user_notifications (user_id, batch_key)
  WHERE batch_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_notifications_user_article_single
  ON user_notifications (user_id, article_id)
  WHERE kind = 'single' AND article_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_prefs_active_standard
  ON notification_preferences (user_id)
  WHERE mute_all = false AND stream_standard = true;

CREATE INDEX IF NOT EXISTS idx_notification_prefs_active_pulse
  ON notification_preferences (user_id)
  WHERE mute_all = false AND stream_pulse = true;

CREATE INDEX IF NOT EXISTS idx_articles_legacy_mongo_id
  ON articles (legacy_mongo_id)
  WHERE legacy_mongo_id IS NOT NULL;
