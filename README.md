# Nuggets v3.0

Next.js 16 App Router application for Nuggets v2, built on Supabase, Vercel, Tailwind, and Playwright.

## Source Of Truth Docs
Read these in order before making architectural or product-facing changes:

1. `docs/NUGGETS_V2_MIGRATION_PLAN.md`
2. `docs/NUGGETS_V2_BLUEPRINT.md`
3. `docs/NUGGETS_V2_PRODUCT_BEHAVIOR_AND_UI.md`
4. `docs/NUGGETS_V2_BUILD_EXECUTION.md`

For launch and operations, use:

- `docs/CUTOVER_RUNBOOK.md`
- `docs/LAUNCH_DAY_CHECKLIST.md`
- `docs/VERCEL_FREE_PLAN_FOLLOWUP.md`

## Local Development
Install dependencies, copy `.env.example` to `.env.local`, then start the app on port `3010`:

```bash
npm install
npm run dev
```

Open [http://localhost:3010](http://localhost:3010).

## Common Commands
- `npm run dev`: local development server on `3010`
- `npm run build`: production build
- `npm run start`: start the production build locally
- `npm run lint`: ESLint
- `npm run release:check`: lint, banned-imports, build, bundle budget, and ETL handoff tests
- `npm run test:feed-pagination`: Playwright check for feed continuation invariants
- `npm run test:detail-visual`: Playwright detail-contract test suite
- `npm run etl:tags`, `npm run etl:articles`, `npm run etl:collections`: staging or production ETL steps

## Capacitor Android (same repo)
This repo now supports Capacitor Android without splitting into a separate mobile codebase.

### Why hosted mode is used
- This Next.js app uses dynamic server features (cookies, server actions, API routes).
- Because of that, there is no safe static Next build output to use as Capacitor `webDir` without major refactors.
- Capacitor uses a tiny local placeholder `webDir` (`mobile-web`) while Android WebView loads the deployed site URL.

### Setup
1. Set your hosted app URL for Android:

```powershell
$env:CAPACITOR_SERVER_URL='https://nuggets.one'
```

2. Generate/update Capacitor web assets placeholder:

```bash
npm run cap:build
```

3. Sync Capacitor config and web assets into native projects:

```bash
npm run cap:sync
```

4. Open Android Studio:

```bash
npm run cap:open:android
```

### Capacitor scripts
- `npm run cap:build`: prepares `mobile-web/index.html` placeholder used by Capacitor tooling
- `npm run cap:copy`: copies Capacitor web assets/config into native projects
- `npm run cap:sync`: runs copy plus plugin/config sync
- `npm run cap:open:android`: opens the in-repo `android/` project in Android Studio
- `npm run cap:android`: convenience command that runs sync, then opens Android Studio

### Android internal testing (Google Play)
Testers do **not** auto-update; upload each new `.aab` to **Internal testing** with a higher `versionCode`. Push needs **both** a Play build (native Firebase/plugin) and a **Vercel** deploy (server/UI). Step-by-step: [`docs/ANDROID_INTERNAL_TESTING.md`](docs/ANDROID_INTERNAL_TESTING.md).

- `npm run android:preflight` — checks `google-services.json`, version, manifest before upload
- `npm run cap:bundle:android` — builds `app-release.aab` after `cap:sync` (requires `android/keystore.properties` for signing)

### Android WebView checks
- OAuth callbacks must be configured for the hosted URL used by `CAPACITOR_SERVER_URL`.
- HTTP URLs may require Android cleartext traffic (debug only); prefer HTTPS for production.
- File uploads/camera access can require native permissions when tested on device.
- Validate Supabase/auth/analytics network calls from inside Android WebView during QA.

## Launch-Critical Validation
These are the repo-local checks to run before a production cutover:

1. `npm run release:check`
2. `npm run test:feed-pagination`
3. `node scripts/validate-og.mjs https://<deploy-url>`
4. Manual share checks for WhatsApp, X, and LinkedIn using a real nugget URL

PowerShell example for validating home and detail paths:

```powershell
$env:OG_PATHS='/,/nuggets/<uuid>/<slug>'
node scripts/validate-og.mjs https://<deploy-url>
```

The OG validator exits non-zero on failure and emits `::error` lines for CI consumption.

## GitHub Workflows
- `Spec Guards`: architecture and bundle-budget baseline on push and pull request
- `Detail Visual Guard`: optional candidate validation for detail-route visual contracts
- `Release Readiness`: manual launch gate that runs repo checks and, when given a deploy URL, candidate OG/detail checks

## Deployment Notes
- Production hosting is Vercel.
- The current repo is the greenfield Next.js app at the repository root; there is no legacy `server/` or `src/` app tree in this repo.
- Above-cap notification fan-out currently follows the Vercel Hobby cron constraint documented in `docs/VERCEL_FREE_PLAN_FOLLOWUP.md`. Revisit that decision before launch if delayed notification drain is unacceptable.
