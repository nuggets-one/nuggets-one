# Nuggets v2 — Comprehensive Audit Report

**Date:** 2026-04-30
**Scope:** Code quality, architecture, performance, security audit of PR-01..PR-18.
**Method:** Evidence-based, file-by-file review against `docs/NUGGETS_V2_BLUEPRINT.md`, `docs/NUGGETS_V2_MIGRATION_PLAN.md`, `docs/NUGGETS_V2_PRODUCT_BEHAVIOR_AND_UI.md`, `docs/NUGGETS_V2_BUILD_EXECUTION.md`.
**Deferred implementation guide:** `docs/DEFERRED_ITEMS_IMPLEMENTATION_GUIDE.md` (follow-up execution notes for deferred audit items).

---

# PHASE 0 — Context Bootstrap

## A) Extracted Constraints (top 25)

1. **Next.js App Router at repo root** (no `web/`); `app/`, `components/`, `lib/`, root `package.json`.
2. **Server-Component default**; `'use client'` only for browser APIs, local UI state, event handlers.
3. **`status` enum (`draft|published`) is the single source of truth** — `is_published` column removed.
4. **`articles.slug` NOT NULL UNIQUE**, generated at insert via `scripts/shared/slug.ts` (no `slugify` package).
5. **`tag_slugs text[]`** denormalized + GIN-indexed; multi-tag = AND via `tag_slugs @> $1::text[]`.
6. **`published_at` set once, never recomputed** — DB trigger enforces; cursor pagination depends on it.
7. **`search_vector` is GENERATED ALWAYS AS STORED** — never trigger, never app-written.
8. **Cursor pagination** `(published_at DESC, id DESC)`; first-page batch = **24** lean rows.
9. **NuqsAdapter mounts in `app/(main)/layout.tsx` ONLY**, never `app/layout.tsx`.
10. **Feed cache scope:** only canonical first page cached via `revalidateTag('feed:standard'|'feed:pulse')`; filtered URLs dynamic.
11. **Pulse:** 120–300s revalidate; standard: 600–900s.
12. **`priority={true}` only on first card (`index === 0`)** — single LCP candidate.
13. **Bookmark hydration:** one batched `GET /api/bookmarks/check?ids=` per feed page (max 24 IDs); anonymous → `200 {}`.
14. **Middleware matcher:** `/admin/:path*`, `/bookmarks`, `/account/:path*`, `/api/bookmarks/:path*` only.
15. **Admin auth gate:** `user.app_metadata.is_admin === true` — exclusive pattern.
16. **Service role key** only in modules with `import 'server-only'`; never in client bundles.
17. **No `cookies()` in root layout** — keeps public routes cacheable.
18. **Notification fan-out:** sync up to 5,000 recipients; queue beyond via Vercel Cron (`/api/cron/notifications-fanout`); `INSERT … ON CONFLICT` on `(user_id, batch_key)` partial unique index.
19. **Recipient query LEFT JOIN** `auth.users` ⨝ `notification_preferences` with `COALESCE` defaults.
20. **Bell rendering:** anonymous users see Sign-in (no bell). Polling: bell-open + 60s while open; stop when closed.
21. **Markdown:** `react-markdown` + `remark-gfm` only. Image override: Cloudinary→`next/image`; else `<img loading=lazy>`. **No `rehype-raw`**.
22. **YouTube player:** poster-first; iframe only on Load; `youtube-nocookie.com`; postMessage seek for `#yt={seconds}` links.
23. **CSP/headers** in `next.config.ts` `headers()`; `frame-ancestors 'none'`, HSTS, etc.
24. **OG validation script** (`scripts/validate-og.mjs`) — launch-blocking.
25. **Open-redirect guard on `next=` param**; reject values not starting with `/` or starting with `//` or containing scheme.

## B) Hard bans / forbidden patterns

- **Packages:** `framer-motion`, `mongoose` (in app), `express`, `@tanstack/react-query`, `@tanstack/react-virtual`, `react-router-dom`, Redux/Zustand/Jotai/Recoil/MobX/Valtio/XState, `moment`/`date-fns`/`dayjs`/`luxon`, `styled-components`/`@emotion/styled`/`stitches`, `react-youtube`/`react-player`, `slugify` (npm), `bullmq`/`redis`/`rate-limit-redis`, `web-push`, `react-modal`, `react-spring`, `auto-animate`, `@vercel/og`, `@sentry/react`/`@sentry/nextjs`, `open-graph-scraper` (in app), `resend` (PMF), `@google/genai` (in app), `papaparse`/`xlsx`/`probe-image-size`.
- **Code:** `is_published` anywhere, `rehype-raw`, `<a href>` for internal routes, `useEffect` chains mirroring `searchParams`, modal/drawer reading UX, TanStack on any read path including bookmarks/notifications, `react-markdown` inside cards, `framer-motion` in non-admin chunks, `react-hook-form` outside `app/admin/**`, `<NuqsAdapter>` in `app/layout.tsx`, service-role outside `server-only` modules, fat `initialArticles` arrays passed to client islands, barrel imports for component trees, `useInfiniteArticles`/`FilterStateContext`/`BookmarkCollection`/`CollectionSelector` analogs, Sentry, scheduled_for/approval_status/access_tier/visibility/slug_version columns, virtualization PMF, sort dropdown, view-mode toggle, dimension grouping in chip rail, desktop left filter sidebar, "Back to top" button, sticky header reveal, push notifications, service worker, reading-time, related-nuggets rail.

## C) Deferred features (must NOT flag as missing)

In-product draft preview · `scheduled_for`/approval workflow · push notifications/PWA/service worker · Sentry · `@vercel/og` dynamic OG · public profiles/avatar/account deletion · custom scroll restoration · virtualization · GenAI SDK in app · Collections admin UI · multiple videos per nugget · masonry · related-nuggets rail · reading time on detail · sort dropdown · view-mode toggle · OR-mode for tags · saved filter presets · `framer-motion` · transactional email (`resend`) · OG scraping (`open-graph-scraper`) · in-feed YouTube iframe · bookmark folders · collection follow/save · author profile pages · /notifications full route · `legacy_mongo_id` redirects (PR-16 optional/skip for greenfield).

## D) Audit assumptions

- **A1.** Repo layout = root (BLUEPRINT §2.a) — Next files at `app/`, `components/`, `lib/`. ✓ verified by git status.
- **A2.** PR-18 complete; cutover pending — current state in CLAUDE.md.
- **A3.** Build sequence implies all PR-01..PR-18 features should be present including admin (PR-14), notifications (PR-14b/§6.6), ETL (PR-15), observability (PR-17), cutover docs (PR-18).
- **A4.** `docs/CUTOVER_RUNBOOK.md` exists (PR-18 deliverable).
- **A5.** Generated artifacts (`.next`, `node_modules`, `dist`, `coverage`) are excluded.
- **A6.** Doc precedence: MIGRATION (data) > BLUEPRINT (architecture) > PRODUCT (UI) > BUILD (sequence) per BUILD §0.
- **A7.** NUGGETS_V2_*.md docs are deleted from `Planning Docs/`; audit references the docs in `docs/`.

---

# PHASE 1 — Codebase Inventory

## Total file counts per directory

| Dir | Count |
|---|---|
| `app/` | 25 (.tsx/.ts) + `globals.css` + `favicon.ico` |
| `components/` | 21 |
| `lib/` | 19 |
| `scripts/` | 12 (3 migrate ETL + 3 client wrappers + 3 validate + 1 og + 1 shared/slug) |
| `types/` | 2 |
| `supabase/migrations/` | 5 SQL |
| Root configs | `next.config.ts`, `package.json`, `tsconfig.json`, `vercel.json`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.mjs`, `.eslintrc.json`, `proxy.ts` |

## Notable inventory facts

- **No `middleware.ts` in repo root.** Repo uses **`proxy.ts`** — confirmed in Next 16.2.4 docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`): *"The `middleware` file convention is deprecated and has been renamed to `proxy`."* The CLAUDE.md and the four core docs still reference `middleware.ts` — this is a doc/code naming drift but **not a functional bug**.
- **No `tailwind.config.ts`** — they use `tailwind.config.js` (allowed; ESLint ignores it).
- **No `app/account/` route** but the proxy matcher includes `/account/:path*`. PRODUCT §0.13 freezes `/account` as required for PMF.

## Coverage Ledger

| File | Status | Sections |
|---|---|---|
| `proxy.ts` | Read | 7 |
| `next.config.ts` | Read | 11, 9 |
| `package.json` | Read | 2 |
| `tsconfig.json` | Read | 10 |
| `tailwind.config.js` | Read | 9 |
| `vercel.json` | Read | 8 |
| `eslint.config.mjs` | Read | 2 |
| `.eslintrc.json` | Read | 2 |
| `postcss.config.js` | Skipped — generated by Next; no audit value | — |
| `app/layout.tsx` | Read | 1, 7, 12 |
| `app/(main)/layout.tsx` | Read | 1, 7 |
| `app/(auth)/layout.tsx` | Read | 1 |
| `app/admin/layout.tsx` | Read | 1, 6, 7 |
| `app/(main)/page.tsx` | Read | 1, 3, 4, 7, 11 |
| `app/(main)/error.tsx` | Read | 4, 12 |
| `app/(main)/nuggets/[id]/[slug]/page.tsx` | Read | 1, 3, 4, 11 |
| `app/(main)/nuggets/[id]/[slug]/not-found.tsx` | Read | 9 |
| `app/(main)/bookmarks/page.tsx` | Read | 1, 3, 7 |
| `app/(main)/collections/page.tsx` | Read | 1, 3 |
| `app/(main)/collections/[id]/page.tsx` | Read | 1, 3 |
| `app/(auth)/login/page.tsx` | Read | 1, 7, 11 |
| `app/(auth)/signup/page.tsx` | Read | 1 |
| `app/(auth)/forgot-password/page.tsx` | Read | 1, 7 |
| `app/auth/callback/route.ts` | Read | 7, 11 |
| `app/admin/page.tsx` | Read | 6 |
| `app/admin/articles/page.tsx` | Read | 6, 3 |
| `app/admin/articles/new/page.tsx` | Read | 6 |
| `app/admin/articles/[id]/page.tsx` | Read | 6, 3 |
| `app/admin/articles/_components/DeleteArticleButton.tsx` | Read | 1, 6 |
| `app/admin/tags/page.tsx` | Read | 6 |
| `app/api/feed/route.ts` | Read | 5, 11 |
| `app/api/search/suggest/route.ts` | Read | 11, 12 |
| `app/api/cron/notifications-fanout/route.ts` | Read | 7, 8 |
| `app/api/notifications/list/route.ts` | Read | 3, 8 |
| `components/providers.tsx` | Read | 1 |
| `components/layout/header.tsx` | Read | 1, 4, 7 |
| `components/layout/header-search.tsx` | Read | 1, 4 |
| `components/layout/header-auth.tsx` | Read | 1, 4 |
| `components/notifications/NotificationPanel.tsx` | Read | 1, 8 |
| `components/ui/article-card.tsx` | Read | 1, 4, 9 |
| `components/ui/bookmark-button.tsx` | Read | 1, 11 |
| `components/ui/article-body.tsx` | Read | 1, 4, 11 |
| `components/ui/article-card-skeleton.tsx` | Read | 4 |
| `components/ui/article-detail-skeleton.tsx` | Read | 4 |
| `components/ui/status-block.tsx` | Read | 1 |
| `components/ui/ThemeToggle.tsx` | Read | 1, 4 |
| `components/feed/feed-pager.tsx` | Read | 5 |
| `components/feed/stream-tabs.tsx` | Read | 1, 4 |
| `components/feed/tag-chip-rail.tsx` | Read | 1 |
| `components/feed/feed-empty.tsx` | Read | 1 |
| `components/feed/feed-skeleton.tsx` | Read | 4 |
| `components/collections/collection-card.tsx` | Read | 4 |
| `components/collections/collection-card-skeleton.tsx` | Read | 4 |
| `components/collections/collection-list-skeleton.tsx` | Read | 4 |
| `components/collections/collection-detail-skeleton.tsx` | Read | 4 |
| `lib/env.ts` | Read | 11 |
| `lib/supabase/server.ts` | Read | 7, 11 |
| `lib/supabase/client.ts` | Read | 11 |
| `lib/supabase/admin.ts` | Read | 11 |
| `lib/supabase/index.ts` | Read | 1 |
| `lib/supabase/types.ts` | Read | 10 |
| `lib/cloudinary-loader.ts` | Read | 9 |
| `lib/cache.ts` | Read | 11 |
| `lib/queries/feed.ts` | Read | 3, 5 |
| `lib/queries/article.ts` | Read | 3 |
| `lib/queries/bookmarks.ts` | Read | 3 |
| `lib/queries/collections.ts` | Read | 3 |
| `lib/queries/tags.ts` | Read | 3 |
| `lib/queries/notifications.ts` | Read | 3, 8 |
| `lib/queries/index.ts` | Read | — |
| `lib/actions/admin.ts` | Read | 6, 11 |
| `lib/actions/auth.ts` | Read | 7, 11 |
| `lib/actions/notifications.ts` | Read | 8 |
| `lib/notifications/fan-out.ts` | Read | 8 |
| `types/article.ts` | Read | 10 |
| `types/collection.ts` | Read | 10 |
| `app/globals.css` | Read | 9 |
| `scripts/shared/slug.ts` | Read | 6 |
| `scripts/migrate/migrate-articles.ts` | Read | (out of app scope) |
| `scripts/migrate/migrate-tags.ts` | Read | (out of app scope) |
| `scripts/migrate/migrate-collections.ts` | Read | (out of app scope) |
| `scripts/migrate/backfill-media-tags.ts` | Read | (out of app scope) |
| `scripts/migrate/mongo-client.ts` | Skipped — utility wrapper, no security/perf surface in app | — |
| `scripts/migrate/supabase-client.ts` | Skipped — utility wrapper | — |
| `scripts/migrate/config.ts` | Read | 11 |
| `scripts/validate/env-verify.ts` | Skipped — dev-only validator (excluded by tsconfig) | — |
| `scripts/validate/run-migration-chain.mjs` | Skipped — dev-only validator | — |
| `scripts/validate/supabase-ddl-verify.ts` | Skipped — dev-only validator | — |
| `scripts/validate-og.mjs` | Read | 12 |
| `supabase/migrations/20240001000000_initial_schema.sql` | Read | 3 |
| `supabase/migrations/20240001000001_rls_policies.sql` | Read | 3, 11 |
| `supabase/migrations/20240001000002_additional_indexes.sql` | Read | 3 |
| `supabase/migrations/20240001000003_pending_fanout.sql` | Read | 8 |
| `supabase/migrations/20240001000004_notification_helpers.sql` | Read | 8 |

**Out-of-scope generated artifacts (excluded):** `.next/`, `node_modules/`, `tsconfig.tsbuildinfo`, `next-env.d.ts`, `package-lock.json`, `public/*.svg`, `public/*.ico`.

---

# PHASE 2 — Audit Execution

## SECTION 1 — RSC / Client boundaries

### S1-F1 — Non-page exports in a route page file (HIGH)
- **File:** `app/admin/articles/new/page.tsx:22-32, 34-124`
- **Confidence:** High
- **Evidence:**
  ```ts
  // new/page.tsx
  export type ArticleFormDefaults = { ... }
  export function ArticleFormFields({ defaults }) { ... }
  ```
  Imported from another page: `app/admin/articles/[id]/page.tsx:4-7`:
  ```ts
  import { ArticleFormFields } from '../new/page'
  import type { ArticleFormDefaults } from '../new/page'
  ```
- **Why it matters:** App Router pages must export `default` (and a small allowlist: `metadata`, `generateMetadata`, `revalidate`, `dynamic`, etc.). Exporting arbitrary symbols from a `page.tsx` is undefined behavior — Next may warn, may inline the file in two route trees, or in a future minor break this entirely.
- **Fix:** Move `ArticleFormFields` and `ArticleFormDefaults` to `app/admin/articles/_components/article-form-fields.tsx` (underscore prefix prevents routing) and import from both pages.

### S1-F2 — `NuqsAdapter` correctly scoped (No issue)
`app/(main)/layout.tsx:1-11` mounts `NuqsAdapter`, not in `app/layout.tsx`. Conforms to BLUEPRINT §17 forbidden list and CLAUDE.md.

### S1-F3 — Server `Header` calls `getUser()` and reads notifications, forcing `(main)` layout dynamic (HIGH)
- **File:** `components/layout/header.tsx:9-20`
- **Evidence:**
  ```ts
  export async function Header() {
    const supabase = await createClient()           // reads cookies()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { count } = await supabase
        .from('user_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
      ...
  ```
- **Why it matters:** BLUEPRINT §5.1 explicitly warns: *"`cookies()` — avoid in the root layout for all routes. Session reads only under layouts that require auth."* The `(main)` layout is the de-facto root for the public site, and `cookies()` here forces all of `/`, `/collections`, `/nuggets/[id]/[slug]` into dynamic rendering — defeating ISR/`revalidateTag` and the §11 "canonical first page cacheable" model. It also adds a DB count query to *every* anonymous render of every public page.
- **Fix:** Move the notification count fetch into `NotificationPanel` itself (it already polls), and bypass the bell in the server layout entirely for anonymous users. Render the auth section via a thin client island so the layout stays static.

### S1-F4 — Hydration mismatch in `HeaderAuth` (MEDIUM)
- **File:** `components/layout/header-auth.tsx:31-46`
- **Evidence:** Server `Header` already knows `user` and conditionally renders `<NotificationPanel>` if logged in. Then `HeaderAuth` (client) starts with `loading=true`, shows "Sign in" placeholder during hydration, then flips to "Sign out / avatar" once `getSession()` resolves.
- **Why it matters:** SSR shows the bell when authenticated (because `Header` sees the user), but `HeaderAuth` SSRs as "Sign in" until client `getSession()` resolves. Visible flash for authenticated users.
- **Fix:** Pass `user` (or just `isAuthenticated`) as a prop from server `Header` into `HeaderAuth`, then hydrate from there — single source of truth.

### S1-F5 — Barrel re-exports server and client modules together (MEDIUM)
- **File:** `lib/supabase/index.ts:1-7`
- **Evidence:**
  ```ts
  export { createClient as createServerClient } from './server'
  export { adminClient } from './admin'    // admin has import 'server-only'
  export { createClient as createBrowserClient } from './client'   // 'use client'
  ```
- **Why it matters:** Re-exporting `adminClient` *and* `createBrowserClient` from one barrel file makes static analysis useless: `'server-only'` only protects the original module. If any client component imports `createBrowserClient` from `@/lib/supabase`, the bundler pulls the entire barrel, and `'server-only'` fires a build-time error.
- **Fix:** Delete the barrel; have callers import directly from `@/lib/supabase/server`, `@/lib/supabase/client`, `@/lib/supabase/admin`.

### S1-F6 — Empty pass-through layout (LOW)
- **File:** `app/(auth)/layout.tsx:1-3`
- **Why it matters:** Adds a layout boundary with no purpose. `<>{children}</>` is a no-op.
- **Fix:** Delete `app/(auth)/layout.tsx`.

### S1-F7 — `'server-only'` placement (LOW)
- **File:** `lib/queries/notifications.ts:1-2`
- `import { createClient } from '@/lib/supabase/server'` followed by `import 'server-only'`. Convention says first.
- **Fix:** Move `import 'server-only'` to line 1.

---

## SECTION 2 — Bundle size and code splitting

### S2-F1 — `mongoose` and `@types/mongoose` in root `devDependencies` (HIGH)
- **File:** `package.json:38, 47`
- **Evidence:** `"@types/mongoose": "^5.11.96"`, `"mongoose": "^9.6.1"` in repo-root `package.json`.
- **Why it matters:** BUILD §10 / `BLUEPRINT` §19 / CLAUDE.md FORBIDDEN say mongoose stays **ETL-only with its own `package.json`**. Putting mongoose in the same `package.json` as the Next app means: (a) Vercel `npm ci` installs it on every production build; (b) any LLM-assisted future change can `import 'mongoose'` from `app/` without an ESLint guard catching it; (c) blueprint specifies separate `package.json` under `scripts/migrate/` precisely to prevent this.
- **Fix:** Move `mongoose`, `@types/mongoose`, `pg`, `@types/pg`, `@types/jsdom`, `jsdom`, `tsx`, `dotenv` into `scripts/migrate/package.json` (new) + bump tsconfig `exclude` to skip `scripts/migrate/`.

### S2-F2 — `autoprefixer` in `dependencies` (LOW)
- **File:** `package.json:21`
- **Why it matters:** Build-time only; should not be in production install.
- **Fix:** Move to `devDependencies`.

### S2-F3 — No bundle-budget CI gate (HIGH)
- **Evidence:** BUILD `PR-06` validation row requires `scripts/check-bundle-budget.mjs`. Repo has `scripts/validate-og.mjs` but no `scripts/check-bundle-budget.mjs`.
- **Why it matters:** BLUEPRINT §2.a freezes this as a launch gate. Without it, a single `import 'react-markdown'` in a card component would silently breach the 85 KiB Home budget.
- **Fix:** Add `scripts/check-bundle-budget.mjs` parsing `.next/build-manifest.json`; run in CI on PR.

### S2-F4 — `react-markdown` import in non-`'use client'` Server Component (No issue)
- **File:** `components/ui/article-body.tsx:1-3`
- Server-rendered markdown is the right call (no client weight). Verified working.

### S2-F5 — `NotificationPanel` heavy client component eagerly mounted (MEDIUM)
- **File:** `components/notifications/NotificationPanel.tsx:1-466`, `components/layout/header.tsx:36-38`
- **Why it matters:** BUILD `PR-14b` / BLUEPRINT §6.6 require *"Performance isolation: notifications fetch/UI must not block `/` first-byte path — lazy-load bell panel"*. Currently the panel ships in the (main) layout chunk for all authenticated pages even before bell click.
- **Fix:** Wrap in `next/dynamic(() => import(...), { ssr: false, loading: () => <BellSkeleton /> })`.

### S2-F6 — Barrel imports observed: only `lib/supabase/index.ts` and `lib/queries/index.ts` (No additional issue)

### S2-F7 — Mongoose accidentally usable from app code (HIGH; relates to S2-F1)
- **File:** `eslint.config.mjs:14-26`
- **Evidence:** ESLint only restricts `@dnd-kit/*`. No restriction on `mongoose`, `pg`, `jsdom`.
- **Why it matters:** CLAUDE.md "FORBIDDEN PACKAGES — never install" lists `mongoose (in web app)`. The "CI grep gate" specified in BUILD `PR-01` is also missing.
- **Fix:** Add `no-restricted-imports` patterns for `mongoose`, `pg`, `bullmq`, `redis`, `framer-motion`, `slugify`, `react-router-dom`, `@tanstack/*` plus a CI grep script (`scripts/check-banned-imports.mjs`) per BUILD `PR-01`.

### S2-F8 — Duplicate ESLint config files (LOW)
- **File:** `.eslintrc.json` (legacy v8) and `eslint.config.mjs` (flat v9)
- **Why it matters:** Two config files create confusion; ESLint 9 ignores `.eslintrc.json` by default.
- **Fix:** Delete `.eslintrc.json`.

---

## SECTION 3 — DB queries and payload discipline

### S3-F1 — `getBookmarkedArticles` returns empty array because of wrong nested-select shape (CRITICAL)
- **File:** `lib/queries/bookmarks.ts:5-33`
- **Confidence:** High
- **Evidence:**
  ```ts
  const { data, error } = await supabase
    .from('bookmarks')
    .select(`article_id, articles ( id, slug, title, ... )`)
  ...
  return data
    .map((row: { articles: ArticleCardProps[] | null }) => row.articles?.[0] ?? null)
    .filter((article): article is ArticleCardProps => article !== null)
  ```
  `lib/queries/collections.ts:130-136` correctly treats the nested join as a single object.
- **Why it matters:** `bookmarks.article_id → articles.id` is a many-to-one FK (one article per bookmark). PostgREST/`@supabase/ssr` returns `articles: <ArticleCardProps>` (single object), not `[ArticleCardProps]`. Calling `.articles?.[0]` on an object returns `undefined`, and the filter eliminates everything. **The entire `/bookmarks` page renders the "Nothing saved yet" empty state, even with bookmarks present.**
- **Fix:** Type the nested column as `articles: ArticleCardProps | null` and replace `row.articles?.[0] ?? null` with `row.articles ?? null`.

### S3-F2 — `app/admin/articles/[id]/page.tsx` uses `select('*')` (MEDIUM)
- **File:** `app/admin/articles/[id]/page.tsx:17-22`
- **Why it matters:** Loads the full row including `content_markdown` (often >5–50 KB), `search_vector` (binary tsvector blob), `legacy_mongo_id`. Search vector serialization across the wire is wasteful.
- **Fix:** Replace with explicit column list matching the `ArticleFormDefaults` shape.

### S3-F3 — Header `getUnreadCount` query lacks `user_id` filter (MEDIUM)
- **File:** `components/layout/header.tsx:14-20`, `lib/queries/notifications.ts:32-42`, `app/api/notifications/list/route.ts:26-30`
- **Why it matters:** Relies entirely on RLS. RLS does protect this — but redundancy at the query level is a defense-in-depth norm.
- **Fix:** Add `.eq('user_id', user.id)` to all four call sites.

### S3-F4 — `getFeedPageBySearch` ignores `cursor` (LOW)
- **File:** `lib/queries/feed.ts:104-147`
- **Why it matters:** Search results > 24 items have no pagination. PMF acceptable, but client `FeedPager.tsx:111` still mounts the `IntersectionObserver`.
- **Fix:** Document explicitly; short-circuit `FeedPager` when `q` is set.

### S3-F5 — `data ?? []` silent failure in tag queries (No issue)
Both functions throw on error; good.

### S3-F6 — `getBookmarkedArticleIds` lacks `user_id` filter (MEDIUM)
- **File:** `lib/queries/bookmarks.ts:48-63`
- Same defense-in-depth concern as S3-F3.
- **Fix:** Add explicit user_id filter.

### S3-F7 — Cursor `.or()` filter uses string interpolation (LOW)
- **File:** `lib/queries/feed.ts:77-82`
- **Why it matters:** `cursor.published_at` and `cursor.id` flow from query params. The API route validates them, so injection is bounded. Defense-in-depth: prefer stricter validation.
- **Fix:** Use `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`.

### S3-F8 — `community_collections.is_published` filter (No issue)
BLUEPRINT §12.3 explicitly allows `is_published` on `community_collections`.

### S3-F9 — `idx_user_notifications_inbox` schema differs from blueprint §13 (LOW)
- **File:** `supabase/migrations/20240001000000_initial_schema.sql:286-289`
- Either is acceptable; partial index is more selective.
- **Fix:** Document the deviation, or align.

### S3-F10 — `idx_articles_feed` (no stream filter) missing (LOW)
- **File:** `supabase/migrations/20240001000000_initial_schema.sql:272-278`
- Currently every feed query is forced to `.eq('content_stream', stream)`. Probably fine PMF.
- **Fix:** Either add the unfiltered index, or remove from blueprint.

---

## SECTION 4 — Rendering performance

### S4-F1 — `priority` set on first detail-page hero AND first card (No issue)
Single LCP candidate per blueprint §9 / §2.a.

### S4-F2 — Detail page wraps hero in fixed `aspect-video` container (No issue)
Prevents CLS.

### S4-F3 — `revalidate=120` on dynamic page is a no-op; cache narrative inert (HIGH)
- **File:** `app/(main)/page.tsx:41`, `lib/queries/feed.ts:1-147`, `lib/cache.ts:28-42`
- **Evidence:** `export const revalidate = 120` *and* page reads `await searchParams` *and* calls `getUser()` *and* calls `unstable_noStore()` for filtered URLs.
- **Why it matters:** BLUEPRINT §11 specifies *"Implementation: Cache lives in `getFeedPage()` via `fetch` + `next: { tags: ['feed:standard'] }`, **not** via `export const revalidate` on `app/page.tsx`"*. Currently:
  - The route is forced dynamic by `cookies()` access in Header → `unstable_noStore()` → so `revalidate = 120` has zero effect.
  - The blueprint-prescribed mechanism (`next: { tags: ['feed:standard'] }` inside `getFeedPage`) is **not implemented** — `lib/queries/feed.ts` uses Supabase client which does not interact with Next's `fetch` cache.
  - Net: every Home request hits Postgres for both feeds + tags + bookmark check + auth + notification count.
- **Fix:** Either (a) move feed fetch to `fetch(...)` with `next.tags` — non-trivial since auth uses Supabase client; or (b) accept dynamic posture and remove `revalidate = 120`, `revalidateTag` calls in cache.ts, and the canonical-cache narrative entirely. Document the chosen path.

### S4-F4 — `app/(main)/collections/page.tsx` `revalidate = 300` ineffective (No issue inherent; see S4-F3)
Same dynamic-parent issue as S4-F3 propagates here.

### S4-F5 — `formatDate` in card uses `Intl.DateTimeFormat` per spec (No issue)

### S4-F6 — `NotificationPanel` skeleton-first (No issue)

### S4-F7 — `CollectionCard` placeholder gradient (No issue)

### S4-F8 — `BookmarkButton` optimistic update (Withdrawn after re-read)
Initially flagged as stale closure; intentional behavior — pre-toggle value drives delete-vs-insert decision.

### S4-F9 — `useDebounce` correct (No issue)

### S4-F10 — Hover `translate-y-px` GPU-composed (No issue)

---

## SECTION 5 — Infinite scroll / pagination

### S5-F1 — No abort-on-unmount on in-flight `fetch` (MEDIUM)
- **File:** `components/feed/feed-pager.tsx:25-71`
- **Evidence:** The `fetchNextPage` `await fetch(...)` has no `AbortController`.
- **Why it matters:** Filter/stream changes via nuqs `shallow:false` cause the parent page to re-render and the `FeedPager` to remount; React will throw a "state update on unmounted component" warning, and the next-page response is wasted bandwidth.
- **Fix:** Add `useRef<AbortController>()`, abort on unmount and on filter change.

### S5-F2 — Cursor encoding correct (No issue)

### S5-F3 — `parseCursor` UUID validation is loose (LOW; see S3-F7)

### S5-F4 — `IntersectionObserver` `rootMargin: '400px'` matches blueprint §7 (No issue)

### S5-F5 — Sentinel renders only when `!isEnd` — correct teardown (No issue)

### S5-F6 — `cards` array reset on filter change implicit via remount (No issue)

---

## SECTION 6 — Admin/forms/modals

### S6-F1 — Admin route protection enforced via layout + actions re-verify (No issue)
Defense in depth ✓.

### S6-F2 — Inconsistent admin-fail redirect: action `/login`, layout `/` (LOW)
- `lib/actions/admin.ts:15` redirects to `/login`; `app/admin/layout.tsx:11` redirects to `/`.
- **Fix:** Standardize per CLAUDE.md (`redirect('/')`).

### S6-F3 — `publishArticleAction` has NO Zod validation (HIGH)
- **File:** `lib/actions/admin.ts:101-140`
- **Why it matters:** BLUEPRINT §15.1 freezes Zod publish validation:
  - title — Non-empty after trim; max 300
  - content_markdown — Non-empty after trim
  - content_stream — Required enum
  - source_url — Valid http(s) URL if present
  - excerpt auto-fill from body if empty

  An admin can publish an article with empty title/body/wrong stream. The DB CHECK constraint catches stream; the rest fall through.
- **Fix:** Refetch article with all required fields, parse via Zod, return error redirect with codes from §15.1 table.

### S6-F4 — `tag_slugs` written without populating `article_tags` join table (HIGH)
- **File:** `lib/actions/admin.ts:31-34, 51, 73-76, 92`
- **Evidence:**
  ```ts
  const tag_slugs = tag_slugs_raw ? tag_slugs_raw.split(',').map(...).filter(Boolean) : []
  ...
  const { error } = await db.from('articles').insert({ ..., tag_slugs })
  ```
  No corresponding `article_tags` insert.
- **Why it matters:** BLUEPRINT §2.a frozen rule: *"`tag_slugs text[]` Required PMF, recomputed in admin save and ETL on every tag write. **`article_tags` remains source of truth, `tag_slugs` is derived.**"*
  CLAUDE.md (admin) requires the exact SQL recomputation from `article_tags`. Currently `article_tags` rows are never created from admin (only ETL inserts them). The detail page uses `article_tags` to render tag labels; admin-created articles will display zero tags on detail.
  Worse: input is **comma-separated free text** with no validation against `tags.slug` existing in DB.
- **Fix:** (a) Look up `tag_id` for each slug via `from('tags').select('id, slug').in('slug', tag_slugs)`; (b) wrap in transaction/RPC that deletes prior `article_tags` rows and inserts new ones; (c) recompute `tag_slugs[]` from join table per CLAUDE.md SQL.

### S6-F5 — `createTagAction` uses inline slug generation (MEDIUM)
- **File:** `lib/actions/admin.ts:182`
- **Evidence:** `const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')` — vs `scripts/shared/slug.ts` `slugify()`.
- **Why it matters:** Admin and ETL must use the same slug generation. Migration scripts at `migrate-tags.ts:34-39` use yet a third inline copy.
- **Fix:** Import `slugify` from `@shared/slug` everywhere.

### S6-F6 — Native form vs `react-hook-form` (No issue)
BUILD `PR-14` allows `react-hook-form` in admin only but does not require it.

### S6-F7 — `unpublishArticleAction` no confirm dialog (MEDIUM)
- **File:** `app/admin/articles/[id]/page.tsx:53-63`, `lib/actions/admin.ts:142-155`
- PRODUCT §15.1 requires explicit confirm.
- **Fix:** Wrap unpublish form button with `confirm()`-based client component.

### S6-F8 — No "Use as feed/card hero" UI (No finding — within deferred scope)

### S6-F9 — `revalidateArticle` uses Next 16 hard-bust signature (No issue)

### S6-F10 — `fanOutOnPublish` is awaited inside publish handler — blocks response (HIGH)
- **File:** `lib/actions/admin.ts:127-138`
- **Evidence:**
  ```ts
  try {
    if (existing?.content_stream && existing?.title) {
      await fanOutOnPublish({ ... })   // ← blocks
    }
  } catch (fanOutError) {
    console.error('[publishArticleAction] fan-out error:', fanOutError)
  }
  ```
- **Why it matters:** BLUEPRINT §6.6: *"Publish handler must complete in ≤ 1.5s including in-cap fan-out"*. At 5,000 recipients × 500/chunk = 10 round-trips to Supabase = up to 1.5s on its own, plus `getRecipients`. The `try/catch` prevents *errors* from propagating, but the publish **response** still waits for fan-out to complete.
- **Fix:** Use `waitUntil()` (Vercel) to run fan-out post-response, or insert a `pending_fanout` row immediately and let the cron drain everything.

### S6-F11 — Tag form checkbox handling correct (No issue)

### S6-F12 — `confirm()` dialog blocks main thread (LOW)
Acceptable PMF.

---

## SECTION 7 — Auth and middleware

### S7-F1 — Proxy matcher includes `/account/*` but no `/account` route exists (MEDIUM)
- **File:** `proxy.ts:44-53`; **no `app/account/` directory**.
- **Why it matters:** BUILD PR-14 / PRODUCT §0.13 freeze `/account` as launch-required.
  - Hitting `/account` → proxy forwards → Next 404.
  - Logged-out user → redirected to `/login?next=/account` → 404.
  - Password reset uses `redirectTo=${baseUrl}/auth/callback?next=/account` (`lib/actions/auth.ts:97`) — sending users to a 404.
- **Fix:** Implement `app/account/page.tsx` per PRODUCT §0.13 (read-only email, display_name edit, change password link, notification prefs toggles) OR change the reset-password redirect target to `/login`.

### S7-F2 — Proxy redirects `/api/*` paths to `/login` HTML instead of returning 401 JSON (HIGH)
- **File:** `proxy.ts:34-39`
- **Evidence:**
  ```ts
  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
  ```
  Matcher includes `/api/bookmarks/:path*`.
- **Why it matters:** When the bookmark client calls `fetch('/api/bookmarks/check?ids=...')` while logged out (or session expired), the response is a **307 redirect to `/login` HTML**, not a JSON `401`. The fetch `res.ok` is true, JSON parse fails silently, the bookmark UI breaks.
- **Fix:**
  ```ts
  if (!user) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // ... existing redirect ...
  }
  ```

### S7-F3 — Proxy `next` param uses trusted pathname (No issue)

### S7-F4 — Host-header poisoning on password-reset / OAuth redirect URLs (HIGH)
- **File:** `lib/actions/auth.ts:91-98, 107-118`
- **Evidence:**
  ```ts
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') ?? 'http'
  const baseUrl = `${proto}://${host}`

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${baseUrl}/auth/callback?next=/account`,
  })
  ```
- **Why it matters:** Host header poisoning. An attacker can submit:
  ```
  POST /forgot-password HTTP/1.1
  Host: attacker.example.com
  email=victim@example.com
  ```
  Supabase emails the victim a password reset link pointing at `https://attacker.example.com/auth/callback?...`. **Same pattern in `googleSignInAction:107-118`** for OAuth redirects.
- **Fix:** Use a fixed `process.env.NEXT_PUBLIC_SITE_URL` (already used in `app/(main)/page.tsx:5`) to build absolute URLs.

### S7-F5 — `/bookmarks` page does not server-redirect anonymous (HIGH)
- **File:** `app/(main)/bookmarks/page.tsx:9-15`
- **Why it matters:** PRODUCT §0.6 / `BLUEPRINT` §0.7: *"Bookmarks — anonymous direct hit: Server redirect to `/login?next=/bookmarks` (NOT 404, NOT empty state)."* The current proxy + page combination is correct *if and only if* the proxy matcher continues to match `/bookmarks` exactly. Single-source-of-truth is brittle.
- **Fix:** Add `if (!user) redirect('/login?next=/bookmarks')` directly in the page Server Component.

### S7-F6 — Auth callback returns 307 redirect on bad code (LOW)
Acceptable.

### S7-F7 — `/api/cron/notifications-fanout` correctly excluded from proxy matcher (No issue)

### S7-F8 — Cron route uses `POST` but Vercel Cron sends `GET` (HIGH)
- **File:** `app/api/cron/notifications-fanout/route.ts:9`
- **Evidence:** `export async function POST(req: NextRequest)`.
- **Why it matters:** Vercel will issue `GET /api/cron/notifications-fanout` and get 405 Method Not Allowed. **Fan-out queue never drains in production.** Authenticated users above the 5,000-recipient cap will never see notifications for over-cap publishes.
- **Fix:** Rename to `export async function GET(...)`. Verify on Vercel staging.

### S7-F9 — Login form echoes unknown error codes verbatim (LOW)
React escapes by default — not XSS.
- **Fix:** Whitelist error codes.

### S7-F10 — Cookie-set machinery in `proxy.ts` (Withdrawn)
Re-read confirms `request.cookies.set` forEach → `supabaseResponse = NextResponse.next({ request })` → response cookies forEach is correct.

### S7-F11 — `pathname` `next` encoding correct (No issue)

### S7-F12 — Login action `error` URL-encoded (No issue)

---

## SECTION 8 — Notifications

### S8-F1 — `kind:'single'` rows inserted with `batch_key` set (HIGH)
- **File:** `lib/notifications/fan-out.ts:51-93`, lines 71-73
- **Evidence:**
  ```ts
  const rows = recipientIds.map((userId) => ({
    user_id: userId,
    article_id: articleId,
    kind: 'single' as const,
    content_stream: stream,
    title,
    batch_key: batchKey,           // ← set on single-kind rows
    is_read: false,
  }))
  ```
- **Why it matters:** BLUEPRINT §6.6: *"**Single-article `kind` notifications use `batch_key = NULL`** and are plain `INSERT` (no conflict with partial index)."*
  The schema has *both* unique indexes:
  - `ux_user_notifications_user_batch_key WHERE batch_key IS NOT NULL` (for batch digests)
  - `ux_user_notifications_user_article_single WHERE kind = 'single' AND article_id IS NOT NULL`

  Setting `batch_key` on `kind='single'` rows means **both partial unique indexes apply**. On a second publish in the same hour bucket of the same stream, the INSERT will collide on the *batch* index for any user who got the previous single notification — hitting `ON CONFLICT (user_id, batch_key)` and the upsert silently no-ops (because `ignoreDuplicates: true`).

  Net impact: under bursty publishing (2+ articles in same hour, same stream), users miss notifications for 2nd-Nth articles.
- **Fix:** Either implement true digest rollup OR set `batch_key: null` on `kind='single'` rows. Per blueprint, the latter is the freeze.

### S8-F2 — `onConflict: 'user_id,article_id'` mismatches partial index condition (MEDIUM)
- **File:** `lib/notifications/fan-out.ts:84`
- Works for current `kind='single'` rows. Implicit dependency.
- **Fix:** Document the dependency.

### S8-F3 — Panel polling stops when closed per spec (No issue)

### S8-F4 — Cron `POST`/`GET` mismatch (HIGH; see S7-F8)

### S8-F5 — Cron drains 10 rows per tick (LOW)
At 1 publish to 50K users: 1 tick handles it. Within Vercel cron budget.

### S8-F6 — `lazyCreatePreferencesAction` race-safe via `ignoreDuplicates: true` (No issue)

### S8-F7 — `markAllNotificationsRead` returns no error visibility (LOW)
Cosmetic; relying on optimistic UI.

### S8-F8 — `notification_preferences` lazy-create matches spec (No issue)

### S8-F9 — `pending_fanout.remaining_user_ids` `uuid[]` size (LOW)
720KB array max for 50K-user publish. PMF acceptable.

### S8-F10 — `kind='digest'` code path unreachable (HIGH; consequence of S8-F1)

---

## SECTION 9 — CSS / Tailwind quality

### S9-F1 — Hardcoded colors leak into card meta chips (MEDIUM)
- **File:** `components/ui/article-card.tsx:92-97`, detail page, `app/admin/articles/page.tsx:48-52`, `app/admin/articles/[id]/page.tsx:43-47`
- **Evidence:** `bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400` for Pulse chip; pattern duplicated in 4 places.
- **Why it matters:** PRODUCT §3.2 freezes a token table. Pulse chip uses raw `amber-*` which isn't in the token vocabulary. If the brand changes amber→ochre, 4 files must be edited.
- **Fix:** Define `--color-pulse-bg / --color-pulse-fg` tokens in `globals.css`, surface as Tailwind utilities.

### S9-F2 — Touch target enforcement inconsistent (MEDIUM)
- **File:** `components/ui/article-card.tsx:120-130, 132-138`; `components/feed/stream-tabs.tsx:37`; `components/feed/tag-chip-rail.tsx:43`; `components/ui/bookmark-button.tsx:92`
- **Evidence:** Most interactive elements have `min-h-[44px]`. **The "View source" link has `min-h-[44px]` but no min-w**. The clear-search button has `min-h-[44px]` but no min-w. The `<Link>` wrapping the title in cards has no minimum tap target.
- **Why it matters:** PRODUCT §15: *"Touch targets ≥ 44×44px where platform guidelines apply."*
- **Fix:** Audit each interactive element; ensure both `min-w` and `min-h` ≥ 44px.

### S9-F3 — No `prefers-reduced-motion` opt-out (MEDIUM)
- **File:** All skeleton components, all `transition-*` classes.
- **Why it matters:** PRODUCT §15: *"Motion: Respect `prefers-reduced-motion` — disable non-essential transitions."*
- **Fix:** Add `motion-safe:` prefixes or `globals.css` rule: `@media (prefers-reduced-motion) { .animate-pulse { animation: none; } }`.

### S9-F4 — Mobile-first responsive grid correct (No issue)

### S9-F5 — Sticky header NOT implemented matches spec (No issue)

### S9-F6 — Header `backdrop-blur-sm` forces composite layer (LOW)
Trivial cost.

### S9-F7 — `prose` typography on detail body not constrained to `max-w-prose` (MEDIUM)
- **File:** `components/ui/article-body.tsx:67-74` uses `max-w-none`.
- **Why it matters:** BLUEPRINT §9.1: *"Reading width stays narrow: body container `max-w-prose` (~65ch)"*. Currently sits inside `max-w-2xl` (672px) — close but not by spec.
- **Fix:** Apply `prose-base max-w-prose mx-auto` to `ReactMarkdown` wrapper.

### S9-F8 — Theme tokens correctly wired (No issue)

---

## SECTION 10 — TypeScript safety

### S10-F1 — `lib/supabase/types.ts` is a manual placeholder (MEDIUM)
- **File:** `lib/supabase/types.ts:14-29`
- **Evidence:** All tables typed as `Row: Record<string, unknown>`. Queries cast results via `as unknown as ArticleCardProps[]`.
- **Why it matters:** Without generated types, every column access is unchecked. The bookmarks bug (S3-F1) is direct evidence.
- **Fix:** Run `npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts`.

### S10-F2 — Heavy use of `as string`, `as ContentStream` casts in admin (LOW)
- **File:** `app/admin/articles/[id]/page.tsx:28-37`, `app/admin/articles/page.tsx:39-69`
- **Fix:** Replace casts with type-safe selects after S10-F1 generation.

### S10-F3 — No `any`, no double-casts spotted (No issue)

### S10-F4 — `@ts-ignore` not used (No issue)

### S10-F5 — `formData.get('foo') as string` without null check (LOW)
- **File:** `lib/actions/admin.ts:24, 65`
- **Why it matters:** Form fields are required at HTML level, but Server Actions can be called outside the form. Defense-in-depth.
- **Fix:** Use `String(formData.get('title') ?? '').trim()`.

---

## SECTION 11 — Security

### S11-F1 — No CSP / security headers configured (HIGH)
- **File:** `next.config.ts:1-21`
- **Evidence:** `nextConfig` only sets `images.loader` and `remotePatterns`. **No `headers()` function.**
- **Why it matters:** BLUEPRINT §5.6 freezes mandatory CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS:
  > "Production headers / CSP — **Required PMF**. Configured in `next.config.ts` `async headers()` — see §5.6."
  - Missing `frame-ancestors 'none'` → site can be iframed for clickjacking.
  - Missing HSTS → MITM downgrade possible on first visit.
  - Missing CSP → no defense against XSS payloads.
  - Missing Permissions-Policy → camera/microphone/geolocation accessible by accident.

  Launch-blocking per spec.
- **Fix:** Add full `async headers()` block from BLUEPRINT §5.6, paste-ready.

### S11-F2 — Service role key not exposed in client bundles (No issue)
`lib/supabase/admin.ts:1` has `import 'server-only'`.

### S11-F3 — Markdown body uses `react-markdown` without `rehype-raw` (No issue)
BLUEPRINT §9.1 explicit ban on `rehype-raw` honored.

### S11-F4 — Host-header poisoning (HIGH; see S7-F4)

### S11-F5 — Proxy matcher includes `/api/bookmarks/:path*` → returns redirect HTML (HIGH; see S7-F2)

### S11-F6 — Search `q` parameter SQL/tsquery safe (No issue)

### S11-F7 — `cloudinaryLoader` accepts arbitrary `src` (LOW)
Bounded by `remotePatterns` allowlist.

### S11-F8 — Cron route `Bearer ${CRON_SECRET}` (No issue)

### S11-F9 — `lib/env.ts:39-42` `clientEnv` parsed at module load (LOW)
Misconfigured deploy crashes hard with clear error — preferable to silent fallback.

### S11-F10 — `BookmarkButton` performs DB writes from client (MEDIUM)
- **File:** `components/ui/bookmark-button.tsx:16-43`
- Functionally correct (RLS scopes to user). However, BLUEPRINT §17 leans toward Server Actions for writes. Also: client-side `getUser()` happens *every click* — adds ~100ms latency.
- **Fix:** Convert to `'use server'` action `toggleBookmarkAction(articleId)`.

### S11-F11 — Auth callback `next` sanitized (No issue, see S7-F3)

### S11-F12 — No rate limit on `/api/search/suggest` (LOW; deferred per spec)
BLUEPRINT §5.5 allows omitting at PMF.

---

## SECTION 12 — Observability

### S12-F1 — `console.error` in API routes (LOW)
Vercel captures these. Per BLUEPRINT §17/19 "Sentry deferred — Vercel logs only at launch" → correct posture. Verify no PII.

### S12-F2 — GoogleAnalytics + @vercel/analytics + SpeedInsights all mounted (No issue)
Per BUILD `PR-17` *"Ship both: GA4 via `next/third-parties/google` and `@vercel/analytics`."*

### S12-F3 — INP-specific reporting (LOW; aspirational)
`@vercel/analytics` does capture INP automatically.

### S12-F4 — No analytics events fired (LOW; deferred PMF)

### S12-F5 — `validate-og.mjs` exists with CI integration (No issue)

### S12-F6 — `app/(main)/error.tsx` uses `useEffect → console.error` (LOW)
Acceptable PMF.

### S12-F7 — No structured request/response logs (LOW)
Adequate PMF.

---

# PHASE 3 — FINAL REPORT

## 13.1 Findings Table (sorted by severity)

| ID | Section | File | Lines | Sev | Conf | Issue | Recommended fix |
|---|---|---|---|---|---|---|---|
| **S3-F1** | 3 | `lib/queries/bookmarks.ts` | 5-33 | **CRITICAL** | High | `getBookmarkedArticles` reads `articles?.[0]` from a single nested object → returns empty for all users; `/bookmarks` permanently shows "Nothing saved yet." | Treat `articles` as single object (`row.articles ?? null`); generate types via `supabase gen types`. |
| **S2-F1** | 2 | `package.json` | 38, 47 | High | High | `mongoose` + `@types/mongoose` in app `package.json` — violates ETL-isolation freeze. | Move ETL deps to `scripts/migrate/package.json`; exclude in tsconfig; add ESLint `no-restricted-imports` ban. |
| **S2-F3** | 2 | `package.json`, CI | n/a | High | High | No bundle-budget CI gate (`scripts/check-bundle-budget.mjs` missing). | Add CI check parsing `.next/build-manifest.json` against blueprint §5.4 ceilings. |
| **S2-F7** | 2 | `eslint.config.mjs` | 14-26 | High | High | No ESLint ban for forbidden packages (only `@dnd-kit/*` covered). | Extend `no-restricted-imports`. |
| **S1-F1** | 1 | `app/admin/articles/new/page.tsx` | 22-124 | High | High | Page file exports non-page symbols (`ArticleFormFields`) imported from sibling page. | Move to `app/admin/articles/_components/article-form-fields.tsx`. |
| **S1-F3** | 1 | `components/layout/header.tsx` | 9-20 | High | High | Server `Header` reads `cookies()` + DB count for unread notifs in `(main)` layout → forces all public pages dynamic; defeats §11 cache model. | Move bell + count fetch into a client island; keep server layout cookie-free. |
| **S4-F3** | 4 | `app/(main)/page.tsx`, `lib/queries/feed.ts`, `lib/cache.ts` | 41 / 1-147 / 28-42 | High | High | `revalidate=120` on dynamic page is a no-op; `revalidateTag('feed:standard')` busts a cache that never exists. | Either implement REST `fetch` with tags OR remove the cache narrative; document chosen path. |
| **S6-F3** | 6 | `lib/actions/admin.ts` | 101-140 | High | High | `publishArticleAction` skips Zod validation prescribed in BLUEPRINT §15.1. | Add Zod parse on existing-row fetch with the freeze table validation codes. |
| **S6-F4** | 6 | `lib/actions/admin.ts` | 31-34, 51, 73-76, 92 | High | High | Admin save writes `tag_slugs[]` directly without `article_tags` rows. Detail-page tag labels missing for admin-created articles. | Resolve slug → tag_id from `tags`; insert/delete `article_tags`; recompute `tag_slugs[]` per CLAUDE.md SQL. |
| **S6-F10** | 6 | `lib/actions/admin.ts` | 127-138 | High | High | `await fanOutOnPublish(...)` blocks the publish response; large recipient sets exceed §6.6's 1.5s SLO. | Wrap with `waitUntil()` (Vercel) or always queue → cron. |
| **S7-F2** | 7 | `proxy.ts` | 34-39 | High | High | Proxy returns HTML 307 to `/login` for unauthenticated `/api/bookmarks/*` calls; client expects JSON 401. | Differentiate `/api/*` paths → `NextResponse.json({error:'Unauthorized'},{status:401})`. |
| **S7-F4** | 7, 11 | `lib/actions/auth.ts` | 91-98, 107-118 | High | High | Host-header poisoning: password reset & OAuth redirects use `headers.get('host')` for `redirectTo` URL. | Use `process.env.NEXT_PUBLIC_SITE_URL`. |
| **S7-F5** | 7 | `app/(main)/bookmarks/page.tsx` | 9-15 | High | High | Page does not server-redirect anonymous → `/login?next=/bookmarks`. | Add `if (!user) redirect('/login?next=/bookmarks')`. |
| **S7-F8** | 7, 8 | `app/api/cron/notifications-fanout/route.ts` | 9 | High | High | Route exports `POST` but Vercel Cron sends `GET` → 405; fan-out queue never drains. | Rename to `export async function GET`. |
| **S8-F1** | 8 | `lib/notifications/fan-out.ts` | 71-73 | High | High | `kind:'single'` rows are inserted with `batch_key` set, contradicting freeze; second hourly publish silently drops via `ignoreDuplicates`. | Set `batch_key: null` for single rows; or implement true `kind='digest'` rollup. |
| **S11-F1** | 11 | `next.config.ts` | 1-21 | High | High | No `headers()` block; CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy all missing. | Paste-ready spec from §5.6. |
| **S3-F2** | 3 | `app/admin/articles/[id]/page.tsx` | 17-22 | Medium | High | `select('*')` loads `content_markdown`, `search_vector` blob, `legacy_mongo_id` for the edit form. | Replace with explicit column list. |
| **S1-F4** | 1 | `components/layout/header-auth.tsx` | 31-46 | Medium | High | Hydration mismatch: server renders bell while client renders "Sign in" placeholder until `getSession()` resolves. | Pass `isAuthenticated` from server `Header` as prop. |
| **S1-F5** | 1 | `lib/supabase/index.ts` | 1-7 | Medium | Medium | Barrel re-exports server (`adminClient`) and client (`createBrowserClient`) modules together. | Delete the barrel; import directly. |
| **S2-F5** | 2 | `components/notifications/NotificationPanel.tsx` | 1-466 | Medium | Medium | 466-line client component eagerly mounted in (main) header for all auth pages. | `next/dynamic({ ssr:false })`. |
| **S3-F3** | 3 | `components/layout/header.tsx`, `app/api/notifications/list/route.ts`, `lib/queries/notifications.ts` | 14-20 / 26-30 / 32-58 | Medium | High | Notification queries lack explicit `.eq('user_id', user.id)`. | Add user_id filter at all four call sites. |
| **S3-F6** | 3 | `lib/queries/bookmarks.ts` | 48-63 | Medium | High | `getBookmarkedArticleIds` lacks `user_id` filter. | Add explicit user_id filter. |
| **S6-F2** | 6 | `lib/actions/admin.ts`, `app/admin/layout.tsx` | 15 / 11 | Medium | High | Inconsistent admin-fail redirect: action `/login`, layout `/`. | Standardize to `redirect('/')`. |
| **S6-F5** | 6 | `lib/actions/admin.ts` | 182 | Medium | High | `createTagAction` rolls inline slug; not the shared util. | Import `slugify` from `@shared/slug`. |
| **S6-F7** | 6 | `app/admin/articles/[id]/page.tsx` | 53-63 | Medium | High | Unpublish has no confirm dialog. | Add client confirm wrapper. |
| **S7-F1** | 7 | `proxy.ts`, `app/account/` | 44-53 / missing | Medium | High | Proxy matches `/account/*` but no `/account` route exists; password-reset email redirects to 404. | Implement `/account` page OR remove from matcher and reset redirect. |
| **S8-F2** | 8 | `lib/notifications/fan-out.ts` | 84 | Medium | Medium | `onConflict: 'user_id,article_id'` couples to partial-index WHERE. | Document dependency. |
| **S9-F1** | 9 | multiple | various | Medium | High | Pulse chip uses raw `amber-*` Tailwind classes — outside the §3.2 token vocabulary. | Add `--color-pulse-bg/fg` tokens. |
| **S9-F2** | 9 | multiple | various | Medium | High | Touch targets inconsistent: card title `<Link>`, "View source" link, search-clear button miss min-w/h ≥ 44px. | Audit, set `min-h-[44px] min-w-[44px]`. |
| **S9-F3** | 9 | global / Tailwind | n/a | Medium | High | No `prefers-reduced-motion` opt-out. | Add motion-safe wrappers. |
| **S9-F7** | 9 | `components/ui/article-body.tsx` | 67-74 | Medium | High | Detail body uses `max-w-none`; spec says `max-w-prose` (~65ch). | Apply `max-w-prose mx-auto`. |
| **S10-F1** | 10 | `lib/supabase/types.ts` | 14-29 | Medium | High | Schema types are placeholder. | Run `supabase gen types`. |
| **S11-F10** | 11 | `components/ui/bookmark-button.tsx` | 16-43 | Medium | Medium | Bookmark insert/delete via direct browser-side anon Supabase. | Convert to `'use server'` action. |
| **S5-F1** | 5 | `components/feed/feed-pager.tsx` | 25-71 | Medium | High | No `AbortController` on in-flight fetch. | Add abort + signal. |
| **S2-F2** | 2 | `package.json` | 21 | Low | High | `autoprefixer` in `dependencies`. | Move to devDeps. |
| **S2-F8** | 2 | `.eslintrc.json` | all | Low | High | Two ESLint config files. | Delete legacy file. |
| **S1-F6** | 1 | `app/(auth)/layout.tsx` | 1-3 | Low | High | Empty pass-through layout. | Delete. |
| **S1-F7** | 1 | `lib/queries/notifications.ts` | 1-2 | Low | High | `import 'server-only'` placed after another import. | Reorder. |
| **S3-F4** | 3 | `lib/queries/feed.ts` | 104-147 | Low | High | Search branch silently drops `cursor`. | Document; short-circuit pager. |
| **S3-F7/S5-F3** | 3, 5 | `app/api/feed/route.ts` | 37-46 | Low | High | Cursor UUID validation accepts non-hex 36-char strings. | Tighten regex. |
| **S3-F9** | 3 | `supabase/migrations/20240001000000_initial_schema.sql` | 286-289 | Low | Medium | `idx_user_notifications_inbox` differs from blueprint §13. | Document or align. |
| **S3-F10** | 3 | `supabase/migrations/20240001000000_initial_schema.sql` | 272-278 | Low | Medium | `idx_articles_feed` (cross-stream) missing. | Add or remove from spec. |
| **S6-F12** | 6 | `app/admin/articles/_components/DeleteArticleButton.tsx` | 8-10 | Low | High | `confirm()` blocks main thread. | Optional: `<dialog>`. |
| **S7-F9** | 7 | `app/(auth)/login/page.tsx` | 25-33 | Low | Medium | Unknown `error` codes echoed verbatim; React escapes — cosmetic. | Whitelist codes. |
| **S10-F2** | 10 | admin pages | various | Low | High | Heavy `as string` casts. | Resolve via type generation. |
| **S10-F5** | 10 | `lib/actions/admin.ts` | 24, 65 | Low | High | `(formData.get('title') as string).trim()` throws if missing. | `String(formData.get(...) ?? '').trim()`. |
| **S11-F12** | 11 | suggest route | n/a | Low | High | No LRU rate limit on `/api/search/suggest`. | Document deferred. |
| **S12-F1** | 12 | API routes | various | Low | Medium | Unstructured `console.error`. | Verify no PII. |
| **S12-F4** | 12 | global | n/a | Low | High | No `share_initiated`/`bookmark_toggle` analytics. | Deferred per BUILD `PR-17`. |

## 13.2 Section Coverage Confirmation

- Section 1 — RSC / Client boundaries — **Audited — 7 findings**
- Section 2 — Bundle size / dependencies — **Audited — 8 findings**
- Section 3 — DB queries & payload — **Audited — 10 findings**
- Section 4 — Rendering performance — **Audited — 10 findings (1 withdrawn)**
- Section 5 — Pagination / infinite scroll — **Audited — 6 findings (mostly No-issue)**
- Section 6 — Admin / forms / mutations — **Audited — 12 findings**
- Section 7 — Auth / middleware — **Audited — 12 findings (1 withdrawn)**
- Section 8 — Notifications — **Audited — 10 findings**
- Section 9 — CSS / Tailwind — **Audited — 8 findings**
- Section 10 — TypeScript safety — **Audited — 5 findings**
- Section 11 — Security — **Audited — 12 findings**
- Section 12 — Observability — **Audited — 7 findings (mostly No-issue)**

## 13.3 Files Not Audited

- `scripts/migrate/mongo-client.ts`, `scripts/migrate/supabase-client.ts` — Skipped: thin client wrappers, out of app scope.
- `scripts/validate/env-verify.ts`, `scripts/validate/run-migration-chain.mjs`, `scripts/validate/supabase-ddl-verify.ts` — Skipped: dev-only validators (excluded by tsconfig); not part of production runtime.
- `postcss.config.js` — Skipped: standard Tailwind PostCSS plumbing.
- `public/*.svg`, `public/*.ico`, `public/*.png` — Skipped: static assets.

All **in-scope** `app/`, `components/`, `lib/`, `types/`, and core config files were audited.

## 13.4 Production Performance Verdict

**NOT READY for production traffic.** While the skeleton/CLS spec, image loader, cursor pagination, RLS posture, and overall RSC layering are correctly built, four classes of production-blocking issues remain: (1) the entire `(main)` route tree is forced dynamic by `Header.getUser()` so the §11 cache model — `revalidate=120`, `revalidateTag('feed:standard')`, ISR for canonical first page — is currently inert (S1-F3, S4-F3), which doubles or triples per-request DB load on every public page hit; (2) the `/bookmarks` page is functionally broken (S3-F1) and the `/api/bookmarks/*` proxy returns HTML redirects instead of 401 JSON (S7-F2); (3) notification fan-out has two separate failure modes — Vercel Cron uses `GET` against a `POST` handler so the queue never drains (S7-F8), and `kind='single'` rows are written with a populated `batch_key` so multiple hourly publishes silently drop via `ignoreDuplicates` (S8-F1); (4) launch-required CSP/HSTS/X-Frame-Options headers are missing entirely (S11-F1) and password-reset/OAuth redirects are vulnerable to host-header poisoning (S7-F4). Each of these is independently launch-blocking under the freeze rules in BLUEPRINT §5.6, §6.6, §11, PRODUCT §0.6.

## 13.5 Launch-Blocking NO-GO List (Critical + High)

1. **S3-F1** — Fix `getBookmarkedArticles` nested-select cardinality. *(Critical)*
2. **S7-F8** — Rename cron handler `POST → GET`. *(High; trivial)*
3. **S8-F1** — Set `batch_key: null` on `kind='single'` rows. *(High)*
4. **S7-F2** — Proxy must return JSON 401 for `/api/*` paths. *(High)*
5. **S7-F4** — Replace `headers.host` with `NEXT_PUBLIC_SITE_URL` in `forgotPasswordAction` and `googleSignInAction`. *(High)*
6. **S7-F5** — Add server-side `redirect('/login?next=/bookmarks')` in `/bookmarks` page. *(High; defense-in-depth)*
7. **S11-F1** — Add `next.config.ts` `async headers()` block per BLUEPRINT §5.6 (CSP, HSTS, X-Frame-Options, etc.). *(High)*
8. **S6-F3** — Add Zod publish validation per BLUEPRINT §15.1 freeze. *(High)*
9. **S6-F4** — Wire `article_tags` from admin save and recompute `tag_slugs[]` from join. *(High)*
10. **S6-F10** — Stop `await`ing `fanOutOnPublish` in publish response; use `waitUntil()` or always queue. *(High)*
11. **S1-F3 + S4-F3** — Resolve dynamic-rendering of `(main)` layout OR remove the cache narrative entirely. *(High)*
12. **S2-F1 + S2-F7** — Move `mongoose` to `scripts/migrate/package.json`; add ESLint ban + CI grep. *(High)*
13. **S2-F3** — Add bundle-budget CI gate (`scripts/check-bundle-budget.mjs`). *(High)*
14. **S1-F1** — Move `ArticleFormFields` out of a `page.tsx`. *(High)*
15. **S7-F1** — Either implement `/account` (PRODUCT §0.13) or change `forgotPassword` redirect target — currently password reset → 404. *(High)*

## 13.6 Fast Follow (post-launch hardening)

- **S3-F2** — Replace `select('*')` in admin edit page with explicit columns.
- **S1-F4** — Eliminate `HeaderAuth` hydration mismatch by passing `isAuthenticated` from server.
- **S2-F5** — `next/dynamic` the notification panel.
- **S5-F1** — Add `AbortController` to feed pager.
- **S6-F7** — Add unpublish confirm dialog (PRODUCT §15.1).
- **S6-F5** — Unify slug generation across admin + ETL via `@shared/slug`.
- **S9-F1** — Tokenize Pulse/Standard chip colors.
- **S9-F2** — Audit and unify 44×44px touch targets.
- **S9-F3** — `prefers-reduced-motion` rules.
- **S9-F7** — `max-w-prose` on detail body.
- **S10-F1** — Run `supabase gen types`; remove `as unknown as X` casts.
- **S11-F10** — Convert `BookmarkButton` to Server Action.
- **S1-F5** — Delete `lib/supabase/index.ts` barrel.
- **S1-F6** — Delete empty `(auth)/layout.tsx`.
- **S1-F7** — Reorder `'server-only'` import in `lib/queries/notifications.ts`.
- **S2-F2** — `autoprefixer` → `devDependencies`.
- **S2-F8** — Delete `.eslintrc.json`.
- **S3-F3 / S3-F6** — Add explicit `user_id` filters even with RLS.
- **S3-F9 / S3-F10** — Reconcile schema/blueprint index lists.
- **S3-F7 / S5-F3** — Tighten cursor UUID regex.
- **S6-F2** — Standardize admin-fail redirect to `/`.
- **S6-F12** — Replace `confirm()` with native `<dialog>`.
- **S7-F9** — Whitelist login error codes.
- **S10-F5** — Defensive `String(formData.get(...) ?? '')` in actions.
- **S11-F12** — Document or implement LRU rate limit on `/api/search/suggest`.
- **S12-F1, S12-F4** — Optional structured logging + analytics events.

---

*End of audit report.*
