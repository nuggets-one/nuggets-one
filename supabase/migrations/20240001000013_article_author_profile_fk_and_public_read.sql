-- Curator chip on cards: allow anon read of profiles for users who publish,
-- and point articles.created_by FK at profiles so PostgREST can embed display_name
-- in one round-trip (no extra client requests).

-- 1) Replace FK to auth.users with FK to public.profiles (same uuid as auth user).
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_created_by_fkey;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_created_by_profile_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT articles_created_by_profile_fkey ON public.articles IS
  'Curator identity for public cards; references profiles.id (mirrors auth.users id).';

-- 2) Public SELECT on profile rows for anyone who has at least one published nugget.
-- Complements "profiles: user owns row" (FOR ALL) — permissive policies OR for SELECT.
CREATE POLICY "profiles: public read published curators"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.created_by = profiles.id
        AND a.status = 'published'
    )
  );

-- 3) Partial index: cheap lookup for “this user has a published nugget” (RLS + embed).
CREATE INDEX IF NOT EXISTS idx_articles_created_by_published
  ON public.articles (created_by)
  WHERE status = 'published' AND created_by IS NOT NULL;
