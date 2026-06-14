-- Reload PostgREST schema cache (safe to re-run after tag dimension DDL).
NOTIFY pgrst, 'reload schema';
