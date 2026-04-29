# Supabase Migrations

Applied in filename (timestamp) order by Supabase CLI.

| File | Contents |
|------|----------|
| `20240001000000_initial_schema.sql` | All tables, triggers, indexes |
| `20240001000001_rls_policies.sql` | RLS enable + all policies |
| `20240001000002_additional_indexes.sql` | §13 supplementary indexes (tags, bookmarks, media, collection entries) |

## Applying to a new project

```bash
supabase db push
```

## Applying manually (SQL Editor)

Run files in order. If policies already exist from Phase 6 validation or a prior apply,
run `scripts/validate/ddl/drop_policies.sql` first (legacy names + PR-02 names).

Recommended sequence:

1. Run `drop_policies.sql` in the SQL Editor when upgrading staging from Phase 6.
2. Apply `20240001000000_initial_schema.sql`, then `20240001000001_rls_policies.sql`, then `20240001000002_additional_indexes.sql`.
3. Verify in the Supabase dashboard; optional: `npx tsx scripts/validate/supabase-ddl-verify.ts`.
