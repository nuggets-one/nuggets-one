# Google OAuth — Production Verification

Verified: 2026-05-26

## Summary

| Check | Result |
|-------|--------|
| App code (login, signup, callback) | OK |
| Supabase Google provider | **Enabled** — `signInWithOAuth` returns Google authorize URL |
| Supabase redirect URLs | **Accepts** `https://nuggets.one` and `https://www.nuggets.one` callbacks |
| Google Cloud OAuth client | **Wired** — production click reaches `accounts.google.com` |
| Production E2E smoke | **PASS** — Playwright `tests/google-oauth-smoke.spec.ts` |
| Local `.env.local` `NEXT_PUBLIC_SITE_URL` | `http://localhost:3010` (dev only; production uses Vercel value) |

**Conclusion:** Google OAuth is **working on production** (`https://www.nuggets.one`). Users hitting apex `https://nuggets.one` are redirected to `www`; ensure both callback URLs stay in Supabase allowlist.

## Commands

```bash
# API + env parity (uses .env.local Supabase project)
node scripts/verify-google-oauth.mjs

# Browser smoke against production
PLAYWRIGHT_BASE_URL=https://www.nuggets.one npx playwright test tests/google-oauth-smoke.spec.ts
```

## Supabase project

- **Project ref:** `npvlfkhpkwciucvhrphk`
- **Auth callback (Google Console):** `https://npvlfkhpkwciucvhrphk.supabase.co/auth/v1/callback`
- **App redirect URLs (Supabase allowlist):**
  - `https://nuggets.one/auth/callback`
  - `https://www.nuggets.one/auth/callback`

## Vercel

Confirm in dashboard (not readable from repo):

- `NEXT_PUBLIC_SITE_URL` = `https://nuggets.one` (no trailing slash)
- `NEXT_PUBLIC_SUPABASE_URL` matches project `npvlfkhpkwciucvhrphk`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` matches the same project
- Set the two Supabase `NEXT_PUBLIC_*` vars in `Production` and `Preview` environments (and `Development` when using Vercel-hosted dev/test deployments)

Local `.env.local` uses `http://localhost:3010` for `NEXT_PUBLIC_SITE_URL`; that does not affect production deploy env.

## Env verification command

Use this check before CI/build runs to fail fast on missing Supabase public vars:

```bash
npm run validate:env
```

Expected behavior:
- exits `0` when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present and valid
- exits non-zero with a clear report when either value is missing/invalid

## Notes

- Apex `nuggets.one` → `www.nuggets.one` (307). OAuth callback uses request `origin`, so `www` sessions work when users sign in on `www`.
- Full sign-in (pick account, return with session cookie) was not automated — smoke only verifies redirect to Google starts.
