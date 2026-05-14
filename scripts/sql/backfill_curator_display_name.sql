-- One-time: copy your profile display_name onto all published articles (card chip).
-- Replace YOUR_USER_UUID with auth.users.id / profiles.id (same value).
-- Run after migration 20240001000014 (column exists).

UPDATE public.articles a
SET curator_display_name = NULLIF(TRIM(p.display_name), '')
FROM public.profiles p
WHERE p.id = 'YOUR_USER_UUID'::uuid
  AND a.status = 'published';
