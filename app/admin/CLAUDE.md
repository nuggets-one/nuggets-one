# Admin — additional rules

## Auth gate (single pattern — no exceptions)
const { data: { user } } = await supabase.auth.getUser()
if (!user?.app_metadata?.is_admin) redirect('/') 

Never use: roles array, custom claims, middleware-only gating for admin.
Always call getUser() — never trust session alone for admin routes.

## Forms
react-hook-form is allowed here and only here.
All form submissions use Server Actions — never client-side fetch to 
an API route for CRUD.

## Service role
Admin queries that bypass RLS use adminClient from 
lib/supabase/admin.ts — never weaken RLS policies instead.

## Slug generation on save
Tag-slugs recompute uses this exact SQL — same in admin and ETL:
UPDATE articles SET tag_slugs = ARRAY(
  SELECT t.slug FROM article_tags at 
  JOIN tags t ON t.id = at.tag_id 
  WHERE at.article_id = $1 ORDER BY t.slug
) WHERE id = $1

## No collections CRUD
community_collections has no admin UI in this PR sequence.
Manage via Supabase Studio only until explicitly scoped.