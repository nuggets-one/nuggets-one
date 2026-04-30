# Nuggets v2 — Cutover Runbook

**Status:** Pre-launch draft — requires human sign-off before execution  
**Last updated:** 2026-04-30  
**Owner:** Ujval Shah

---

## Pre-Cutover Checklist

All items must be checked before touching DNS.

### Vercel Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set (production project)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set (production project)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (server-only)
- [ ] `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` set
- [ ] `NEXT_PUBLIC_GA_ID` set (G-XXXXXXXXXX)
- [ ] `NEXT_PUBLIC_SITE_URL` set (https://nuggets.one)
- [ ] `CRON_SECRET` set (openssl rand -hex 32)

### Supabase Production Project
- [ ] All migrations applied (run `supabase db push` or apply manually in order)
- [ ] RLS policies verified — anon cannot read drafts
- [ ] RLS policies verified — user A cannot read user B's bookmarks
- [ ] `get_notification_recipients` function deployed
- [ ] `pending_fanout` table exists with partial index
- [ ] Google OAuth provider configured in Supabase Auth dashboard
- [ ] Email provider configured (SMTP or Supabase default)
- [ ] At least one admin user has `app_metadata.is_admin = true`

### ETL (PR-15)
- [ ] Dry-run completed on staging — article count, tag count, collection count verified
- [ ] `legacy_mongo_id` uniqueness verified (no collisions)
- [ ] `both` → `standard` stream mapping confirmed
- [ ] `tag_slugs[]` populated for all migrated articles
- [ ] Slug uniqueness verified — no duplicate slugs in output
- [ ] Production ETL run approved by founder

### Content QA
- [ ] Sample 10 articles: title, excerpt, hero image, stream, tag slugs — match Mongo source
- [ ] At least one Standard article renders correctly on detail page
- [ ] At least one Pulse article renders correctly on detail page
- [ ] `article_tags` join table populated for migrated content

### OG / SEO
- [ ] `node scripts/validate-og.mjs https://nuggets.one` exits 0
- [ ] `OG_PATHS="/,/nuggets/<uuid>/<slug>" node scripts/validate-og.mjs https://nuggets.one` exits 0
- [ ] Manual WhatsApp share test — rich preview appears
- [ ] Manual X (Twitter) share test — summary_large_image card appears
- [ ] Manual LinkedIn share test — image + title appear

### Performance
- [ ] Lighthouse mobile score ≥ agreed threshold on `/`
- [ ] Lighthouse mobile score ≥ agreed threshold on a nugget detail page
- [ ] No `content_markdown` visible in RSC payload for home feed (Network tab)
- [ ] INP visible in Vercel Speed Insights after first real traffic

### Auth
- [ ] Login with email/password works end-to-end
- [ ] Login with Google OAuth works end-to-end
- [ ] Protected routes (`/bookmarks`, `/account`, `/admin`) redirect when logged out
- [ ] Public `/` loads without session cookie (anon-safe)
- [ ] Bookmark toggle works for authenticated user
- [ ] Admin publish triggers notification fan-out (check `user_notifications` table)

### Notifications
- [ ] Bell renders for authenticated users
- [ ] Bell hidden for anonymous users
- [ ] Publish an article in admin → `user_notifications` rows appear
- [ ] Cron secret set in Vercel — cron route returns 401 without it
- [ ] Vercel Cron schedule active (check Vercel dashboard → Cron Jobs)

---

## Cutover Steps

Execute in this exact order. Do not skip steps.

### 1. Freeze writes on old stack
- Put Express API in read-only mode (disable POST/PUT/DELETE routes or take down write endpoints)
- Announce internally: "MongoDB is now read-only"
- Note the exact timestamp

### 2. Final ETL run
- Run production ETL against live MongoDB (read-only at this point)
- Verify final row counts match expected
- Note any delta from dry-run

### 3. Deploy v2 to Vercel production
- Merge final branch to main
- Confirm Vercel production deployment succeeds
- Smoke test `/`, one article detail, login, bookmark toggle

### 4. DNS cutover
- Point `nuggets.one` A/CNAME records to Vercel
- TTL: set to 60s at least 1 hour before cutover for fast rollback
- Verify SSL certificate auto-provisions (Vercel handles this)
- Wait for propagation (check with `dig nuggets.one`)

### 5. Post-cutover verification (first 30 minutes)
- [ ] `https://nuggets.one` loads correctly
- [ ] OG validator passes against production URL
- [ ] Login works on production
- [ ] Admin publish works on production
- [ ] Check Vercel logs for errors — error rate baseline
- [ ] Check Supabase logs for unexpected query failures

---

## Rollback Procedure

If any post-cutover check fails:

1. **DNS rollback** — point `nuggets.one` back to old Vite+Express deployment
   - TTL was set to 60s — propagation is fast
   - MongoDB is still read-only but still authoritative
2. **Root cause** — identify whether failure is in Next.js app, Supabase, or ETL data
3. **Do not re-enable MongoDB writes** until you know whether any writes happened to Supabase that need reconciliation
4. Fix forward — document what failed and what the fix is before second cutover attempt

### Signals that require immediate rollback
- Error rate spike above baseline within first 10 minutes
- Auth failures (users cannot log in)
- Wrong articles visible (RLS hole — drafts appearing publicly)
- Redirect loops on any route
- Admin cannot publish

---

## Files Retained Until Cutover (Do Not Delete)

These files remain in the repository until cutover is signed off:

- `server/src/index.ts` — Express entry point
- `src/App.tsx` — Vite SPA entry
- `vite.config.*` — Vite build config
- `src/` — entire legacy SPA tree
- MongoDB connection config

**Delete policy:** Archive or delete only after 30 days post-cutover with no rollback incidents and after MongoDB backups are confirmed.

---

## Post-Cutover Cleanup (30 days after launch)

- [ ] Remove `server/` directory (Express API)
- [ ] Remove `src/` directory (Vite SPA)
- [ ] Remove `vite.config.*`
- [ ] Remove legacy npm packages from old `package.json` (if any remnants)
- [ ] Confirm `legacy_mongo_id` columns are retained (keep for 6+ months for debugging)
- [ ] Close MongoDB Atlas cluster (after final backup downloaded)
- [ ] Update `CLAUDE.md` to remove all legacy stack references

---

## Sign-Off

| Role | Name | Date | Signature |
|---|---|---|---|
| Founder / Owner | | | |

**Cutover is approved when this table is complete.**

---

*Document version: PR-18 — final PR in Nuggets v2 build sequence.*
