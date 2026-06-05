# Nuggets v2 — Launch Day Checklist

Use this with `docs/CUTOVER_RUNBOOK.md`. This file is command-first and execution-oriented.

## 0) What can be done here vs externally

- **In-repo (can run from terminal):**
  - Build checks
  - OG validator
  - ETL script execution
  - Local/preview smoke checks
- **External (manual dashboards):**
  - Supabase production project creation/config
  - Vercel environment variable setup
  - DNS TTL/cutover
  - OAuth provider setup

## 1) Preflight (repo)

From repo root:

```bash
npm run release:check
npm run test:feed-pagination
```

Expected: both commands exit `0`.

Optional but recommended from GitHub before launch:

- Run the `Release Readiness` workflow with a real preview or staging `deploy_url`
- Supply `og_paths` that include `/` and at least one real nugget route

Confirm OG fallback assets exist:

- `public/og-default.png`
- `public/og-default.svg`

## 2) ETL dry-run on staging (first hard gate)

Run ETL scripts against **staging** Supabase only.

```bash
npm run etl:tags
npm run etl:articles
npm run etl:collections
```

Validate after run:

- Article/tag/collection counts match Mongo export
- `both -> standard` mapping verified
- `tag_slugs[]` populated
- Slug uniqueness verified
- `legacy_mongo_id` uniqueness verified

If any mismatch: stop and fix before proceeding.

## 3) Supabase production setup (external)

Manual in Supabase dashboard:

- Create separate production project
- Apply all migrations in order
- Verify RLS:
  - anon cannot read drafts
  - user A cannot read user B bookmarks
- Confirm notification helpers exist:
  - `get_notification_recipients` function
  - `pending_fanout` table and undrained-row index
- Set at least one admin user (`is_admin=true` in app metadata)
- Configure Google OAuth provider
- Configure email provider

## 4) Vercel production env vars (external)

Set/verify:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_GA_ID`
- `NEXT_PUBLIC_SITE_URL=https://nuggets.one`
- `CRON_SECRET`
- `FCM_SERVICE_ACCOUNT_JSON` (required for Android push; base64 or raw JSON)

Notes:

- `CRON_SECRET` must match what cron-protected route expects.
- Keep `NEXT_PUBLIC_GA_ID` empty in local; set real ID in production.
- If deploying on Vercel Hobby/free plan, review `docs/VERCEL_FREE_PLAN_FOLLOWUP.md` and `docs/NOTIFICATIONS_SLA.md` before launch decisions.
- Confirm the team has explicitly accepted the current once-daily cron SLA, or uses manual drain / Pro for time-sensitive push.

### Push health gate (launch-blocking if Android push is live)

Against production deploy URL:

```bash
curl -s https://<deploy-url>/api/health/push
```

Expected: `"configured": true`, `"status": "ok"`.

If `misconfigured`, fix `FCM_SERVICE_ACCOUNT_JSON` before telling testers push is ready.

Manual drain smoke test (optional but recommended):

```bash
curl -s -X POST https://<deploy-url>/api/admin/notifications/drain \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"targets":["push"]}'
```

## 5) OG validation (preview/prod candidate)

Run against a deploy URL with a real article:

```bash
# Bash
OG_PATHS="/,/nuggets/<real-uuid>/<real-slug>" node scripts/validate-og.mjs https://<deploy-url>
```

PowerShell equivalent:

```powershell
$env:OG_PATHS='/,/nuggets/<real-uuid>/<real-slug>'
node scripts/validate-og.mjs https://<deploy-url>
```

Expected: all checks pass.

If running from GitHub Actions instead of a local terminal, use the `Release Readiness` workflow and pass the same base URL plus `og_paths`.

## 6) Manual share tests (launch-blocking)

Test a real article URL on:

- WhatsApp
- X (Twitter)
- LinkedIn

Expected: title + description + image render correctly.

## 7) Cutover preparation (external)

- Lower DNS TTL to `60s` (at least ~1 hour ahead)
- Freeze writes on the legacy Mongo-backed production stack
- Announce read-only window

## 8) Cutover execution

1. Final ETL run (with old stack read-only)
2. Deploy final v2 build
3. Re-run OG validation against the production candidate URL
4. Flip DNS to Vercel
5. Run 30-minute post-cutover checks:
   - Home/detail load
   - Auth works
   - Admin publish works
   - OG validator still passes
   - Vercel and Supabase logs clean baseline

## 9) Rollback trigger rules

Rollback immediately if:

- Error rate spikes
- Auth breaks
- Draft visibility/RLS leak appears
- Redirect loops
- Admin publish path fails

Then follow rollback steps in `docs/CUTOVER_RUNBOOK.md`.
