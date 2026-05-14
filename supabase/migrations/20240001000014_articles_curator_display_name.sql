-- Public card byline: one column on articles — no anon join to profiles for the feed.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS curator_display_name text;

COMMENT ON COLUMN public.articles.curator_display_name IS
  'Denormalized curator display name for card chip; set on admin create/update/publish from profiles.display_name.';
