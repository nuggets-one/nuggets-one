# Homepage UI/UX Session Changelog

## Purpose
Track all homepage-focused UI/UX, performance, and interaction changes made during this implementation session for future audits, QA, and launch sign-off.

## Session Scope
- Homepage visual/interaction refinements
- Card action hierarchy and readability improvements
- Filter rail density governance
- Header/auth responsiveness and payload reduction
- Performance and Lighthouse regression checks
- Accessibility and reduced-motion compliance updates
- **[2026-05-02]** Homepage remediation **Phase 11** (search suggest row cap verification) — see Work execution log below
- **[2026-05-02]** Homepage remediation **Phase 2** (YouTube hero `hqdefault` fallback when `hero_thumb_url` missing) — see Work execution log below
- **[2026-05-02]** Homepage remediation **Phase 3** (`PRODUCT` §3.3 header strip + auth island **`isAdmin`**) — see Work execution log below

## Work execution log (review trail)

Use this section for **time-ordered, reviewable notes** on each batch of work (what was done, why, what was explicitly deferred). Older shipped phases above remain the historical record; new entries append here.

### 2026-05-02 — Phase 11 only (operator request)
- **Executed:** `suggestArticles` cap verification and hard cap in `lib/queries/article.ts`; docs sync in `docs/HOMEPAGE_UI_UX_REMEDIATION_PLAN.md` (**§0e**, status table, Phase 11 section) and this changelog.
- **Deferred (unchanged, still blocking launch sign-off until run):** prerequisite **QA checklist** items (Phase 14 Tier 1 smoke, Phase 15 sheet smoke, keyboard/reduced-motion/card hierarchy, etc.) — already listed under **QA Checklist for Final Verification**. **Lighthouse** regression triage — already under **Latest Regression Validation**. No duplicate procedure text added; sequencing note under **Remaining To-Do** below.

**Files touched this batch**
- `lib/queries/article.ts` — `SEARCH_SUGGEST_ROW_CAP`, `.limit(Math.min(limit, SEARCH_SUGGEST_ROW_CAP))`
- `lib/queries/index.ts` — re-export `SEARCH_SUGGEST_ROW_CAP`
- `docs/HOMEPAGE_UI_UX_REMEDIATION_PLAN.md` — §0 status, new **§0e**, Phase 11 section marked complete
- `docs/HOMEPAGE_UI_UX_SESSION_CHANGELOG.md` — this log + pending snapshot update

**Verification**
- `npm run build` → **exit 0** (Next.js 16.2.4, this session)
- Optional before merge: `GET /api/search/suggest?q=te&stream=standard` → `suggestions.length <= 8`

### 2026-05-02 — Phase 2 (after Phase 11 pushed to `main`)
- **Executed:** YouTube card hero fallback in `components/ui/article-card.tsx`; shared **`youTubePosterHqUrl`** in `lib/ui/excerpt-card.ts`; remediation plan **§0f** + Phase 2 section marked complete; changelog snapshot updated.
- **Commits:** Phase 11 on `main` as `f11b342`; Phase 2 — `feat(homepage): YouTube hqdefault fallback when hero thumb missing` (tip SHA: `git log -1 --oneline` after pull — avoid self-edit loops in this log).

**Files touched this batch**
- `components/ui/article-card.tsx` — derive `heroThumbForCard` from stored thumb or `hqdefault` when `hero_media_kind === 'youtube'` and `hero_video_id` present
- `lib/ui/excerpt-card.ts` — `youTubePosterHqUrl(videoId)`
- `docs/HOMEPAGE_UI_UX_REMEDIATION_PLAN.md` — §0, **§0f**, §5 Phase 2, resolved build order
- `docs/HOMEPAGE_UI_UX_SESSION_CHANGELOG.md` — this log, Remaining To-Do, Commits list, Phase 2 shipped section

**Verification**
- Run `npm run build` before merge (local full build can take several minutes on cold compile).

### 2026-05-02 — Phase 3 (header + auth island)
- **Executed:** Removed masthead **`Home` / `Collections` / `Create nugget`** (desktop + mobile rows). **`GET /api/auth/status`** returns **`isAdmin`**. Avatar menu: **Bookmarks**, **Collections**, **Admin** + **Create nugget** (admin-only), Legal, **Sign out**; **`/account`** removed. Docs: remediation plan **§0g**, §5 Phase 3, **M6**; this changelog.

**Files touched**
- `components/layout/header.tsx`
- `components/layout/header-auth-island.tsx`
- `app/api/auth/status/route.ts`
- `docs/HOMEPAGE_UI_UX_REMEDIATION_PLAN.md`
- `docs/HOMEPAGE_UI_UX_SESSION_CHANGELOG.md`

**Verification**
- `npm run build` before merge / push.
- Manual: anon → **Sign in** only; signed-in reader → Bookmarks + Collections, no Admin/Create; admin → Admin + Create nugget present.

## Baseline and Measured Deltas
Measured with local production Lighthouse runs on `/`:

1. Baseline snapshot
   - Performance: 58
   - FCP: 1094 ms
   - LCP: 7810 ms
   - TBT: 527 ms
   - Transfer: 1,206,343 bytes

2. Post UI/perf batch
   - Performance: 75
   - FCP: 1192 ms
   - LCP: 4366 ms
   - TBT: 330 ms
   - Transfer: 462,471 bytes

3. Post anonymous auth-gating
   - Performance: 91
   - FCP: 1073 ms
   - LCP: 3469 ms
   - TBT: 60 ms
   - Server response audit: 876 ms -> 115 ms

4. Post server-rendered header auth
   - Performance: 95
   - FCP: 1066 ms
   - LCP: 2804 ms
   - TBT: 87 ms
   - Transfer: 324,331 bytes

## Implemented Changes (Grouped)

### A) Card UX and action consistency
- Normalized primary card action to `View Full Article`.
- Made card action feedback immediate (`active` states).
- Improved dark card separation (subtle border/shadow tuning).
- Added bounded card richness:
  - Optional second tag on larger screens.
  - Secondary source host link (`Source: <host> ↗`) when available.
- Ensured skeleton mirrors card footer/action geometry.

### B) Filter rail UX
- Added active-state clarity improvements.
- Added compact default density with controlled expansion:
  - `Show more / Show less`
  - Selected tags prioritized in collapsed mode.

### C) Feed paging behavior
- API now includes `bookmarkedArticleIds` for paginated/no-store contexts.
- Infinite-scroll cards now receive consistent initial bookmark state.

### D) Header and auth path
- Reduced header crowding on narrow screens (control prioritization).
- Added immediate feedback states to header controls.
- Moved header auth state to server-rendered props (removed client auth sync path).
- Added auth cookie short-circuit to skip unnecessary auth calls for anonymous requests.
- **[2026-05-02 Phase 3]** Stripped **`Home` / `Collections` / `Create nugget`** from header; **`isAdmin`** on **`/api/auth/status`**; avatar menu destinations + admin-gated Admin/Create (**`/account`** link dropped per plan).

### E) Empty/error status consistency
- Standardized feed empty and pager error surfaces with shared `StatusBlock`.
- Preserved recovery actions (`Clear search`, `Clear filters`, `Retry`).

### F) Motion accessibility
- Added `motion-safe`/`motion-reduce` handling in card hover and skeleton shimmer.
- Reduced-motion users now avoid non-essential animation.

### G) Local robustness and control accessibility
- Added hero image URL safety guard so non-image URLs (for example, PDF links) do not reach `next/image`.
- Updated CSP behavior to allow `unsafe-eval` in development only, preserving strict production CSP.
- Added stronger keyboard focus-visible states for:
  - Stream tabs
  - Tag chips
  - Tag rail expand/collapse control
  - Header search clear button and suggestion items

## Commits Created in This Session
- `46b6816` Improve homepage responsiveness and cut initial load cost.
- `bb21ded` fix: align card actions and pager bookmark state
- `e3cbd8d` docs: add Vercel hobby follow-up guidance
- `d1486d3` fix: standardize feed status surfaces with StatusBlock
- `7ed99ec` fix: respect reduced-motion in card interactions
- `3e42bf8` feat(homepage): ship remediation Phases 1, 13, 14 (Tier 1), 16
- `19c4754` feat(homepage): ship Phase 15 — sheet/parallel-route detail
- `f11b342` fix(search): enforce suggest row cap and document Phase 11
- _(Phase 2026-05-02)_ `feat(homepage): YouTube hqdefault fallback when hero thumb missing` — see `git log` on `main` for exact SHA.
- _(Phase 2026-05-02)_ `feat(homepage): Phase 3 header strip and auth island` — see `git log` on `main` after push.

## Pending (Not Yet Committed)
Run `git status` after committing Phase 3 (should be clean once pushed).

## Latest Regression Validation (Post-Polish)
- Production build status: pass.
- Feed API smoke check: `bookmarkedArticleIds` present for search context (`/api/feed?stream=standard&q=test`).
- Local runtime parity issue (CSP + invalid image URL) resolved in code and validated by user.
- Lighthouse regression check was rerun twice and showed a drop vs best-known snapshot:
  - Run 1: score 62, LCP 4472 ms, TBT 719 ms
  - Run 2: score 58, LCP 4269 ms, TBT 1006 ms
- Top opportunities in latest run:
  - `unused-javascript` (~780 ms savings)
  - `server-response-time` (~484 ms savings)
- Interpretation: measurable regression from best known snapshot likely related to renewed JS overhead + slower first response in current local state. Needs follow-up perf pass before launch freeze.

## Known Local vs Vercel Divergence Explained
- Local encountered:
  1) `next/image` host/URL validation error for non-image source URL.
  2) CSP + React dev `eval` runtime error.
- Vercel looked correct because production data/CSP/runtime path differs from local dev path.

## QA Checklist for Final Verification
- [x] Homepage loads correctly in local `next dev` and production build.
- [x] No `next/image` runtime error for malformed/non-image `hero_thumb_url`.
- [x] No CSP `eval` runtime error in development.
- [ ] Card action hierarchy remains:
      primary `View Full Article`, secondary source link.
- [ ] Filter rail collapse/expand behaves correctly with selected tags.
- [ ] Bookmark state remains consistent on paginated cards.
- [ ] Reduced-motion preference disables non-essential motion.
- [ ] Keyboard focus ring visibility is clear on stream tabs, chips, and search suggestions.
- [ ] Lighthouse does not regress from session best known snapshot. (currently failing in latest local runs)
- [ ] Phase 14 (Tier 1) multi-image grid renders correctly on Twitter / Reddit / Imgur / LinkedIn samples (2/3/4-image cases + `+N` overlay); Cloudinary-only LCP regression unchanged.
- [ ] Phase 15 sheet smoke checklist (plan §0d): card-click → sheet opens with grid/scroll preserved; Escape & backdrop close; second card click swaps; direct URL paste shows canonical page (no sheet); back/forward toggles; filter change behind open sheet; reduced-motion snap; mobile swipe-down dismiss; tab cycles inside sheet; body scroll locked while open.

## Remaining To-Do (Plan Completion)

Source-of-truth status table for remediation phases is in `docs/HOMEPAGE_UI_UX_REMEDIATION_PLAN.md` §0. Snapshot:

**Shipped 2026-05-01:** Phases 1, 13, 14 (Tier 1), 15, 16.  
**Verified / completed 2026-05-02:** Phase 11 (suggest cap — plan **§0e**).  
**Shipped code 2026-05-02:** Phase 2 — YouTube **`hqdefault`** fallback (plan **§0f**); Phase 3 — header strip + auth **`isAdmin`** (plan **§0g**).

**Explicit sequencing (2026-05-02):** Prerequisite **QA** (Phase 14/15 smoke, cross-cutting checklist rows) and **Lighthouse** re-baseline/triage were intentionally **not** run in this batch; they remain open in **QA Checklist for Final Verification** and **Latest Regression Validation** until the operator runs them or a later session does.

**Pending:**
- **P1** — Phase 4 (stream tabs restyle + mobile bottom nav — Phase 3 satisfied), Phase 5 (site footer), Phase 6 (YouTube state machine on detail), Phase 7 (card source badge), Phase 8 (share button, card + detail).
- **P2** — Phase 9 (active filters bar), Phase 10 (filters popover + tag counts), Phase 12 (infinite scroll diagnostic).
- **Follow-up** — Phase 14.5 (Cloudinary `image/fetch` proxy, ~2 weeks after Phase 14 Tier 1).

### Cross-cutting QA (still owed before launch sign-off)
- Phase 14 (Tier 1) browser smoke on Twitter / Reddit / Imgur / LinkedIn samples.
- Phase 15 sheet smoke checklist (plan §0d).
- Lighthouse re-baseline after Phases 14 + 15 land — current best snapshot was pre-Phase-14.
- Card action hierarchy consistency across `/`, paginated feed, `/bookmarks`, `/collections/[id]` (still owed from Phase 16; Phase 7 + Phase 8 will affect this).
- Keyboard-only navigation pass.
- Reduced-motion verification in-browser with system preference enabled.
- Mobile/tablet ergonomic QA (sticky header, tap targets, scroll).

## Recommended Execution Order
1. Performance regression closure
2. UX consistency + accessibility + mobile/tablet QA
3. Documentation finalization and sign-off

---

## Remediation Plan — Phase 1 shipped (2026-05-01)

Source plan: `docs/HOMEPAGE_UI_UX_REMEDIATION_PLAN.md` (LOCKED 2026-05-01).

### What changed
- **L2** widened content max-width: `max-w-[90rem]` → `max-w-[1800px]` (`app/(main)/layout.tsx`).
- **L1** standardized grid breakpoints to `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` across `app/(main)/page.tsx`, `components/feed/feed-pager.tsx`, `components/feed/feed-skeleton.tsx`. (Note: 2-col now triggers at `md` 768px, not `sm` 640px.)
- **L3** reworked `components/feed/tag-chip-rail.tsx`: dropped expand-in-place collapse, single horizontal-scroll lane, hidden native scrollbar, overflow-aware left/right fade gradients via `ResizeObserver` + scroll listener.
- **C2** rewrote `lib/ui/excerpt-card.ts` to strip `**bold**`, `__bold__`, `~~strike~~`, `*italic*`, underscore italic (snake_case-safe), inline `` `code` ``, headings, list markers, `>` quotes, `[[ts]]` / footnote-ref markers, image markdown; added 120-char word-boundary-safe truncation with caller override.
- **C6** moved card publication date from top meta row to footer meta row, right-aligned (`components/ui/article-card.tsx`).
- **C3** added defensive `tag_slugs` filter (drops `'nuggets'`, `'pulse'`) and `+N` overflow pill that renders when ≥3 effective tags, with viewport-conditional count (`+{N-1}` <lg, `+{N-2}` ≥lg).

### Scope deviation
The locked plan's Phase 1 mentioned a placeholder `More (N)` chip at the end of the rail. **Not shipped.** A no-op chip violates `CLAUDE.md`'s "no half-finished implementations" rule. Phase 10 will introduce the chip and the popover together. Documented in §0a of the remediation plan.

### Verification
- `npm run build` → exit 0 (Next.js 16.2.4 Turbopack).
- `node scripts/check-bundle-budget.mjs` → `Home=42601B  Detail=38404B`. Well under 85/60 KiB caps.
- Manual browser smoke not yet performed in this session — recommended pre-merge.

---

## Remediation Plan — Phase 14 (Tier 1) shipped (2026-05-01)

Source plan: `docs/HOMEPAGE_UI_UX_REMEDIATION_PLAN.md` §2.J + §0c (LOCKED 2026-05-01).

### What changed
- New `lib/ui/is-image-url.ts` — pure server-safe image-URL classifier, ported from `docs/CARD_MEDIA_IMAGE_URL_PATTERNS.md` §1–6.
- New `lib/ui/card-image-host.ts` — single source of truth for host gating. Tier-1 passthrough hosts: Twitter / Reddit / Imgur / LinkedIn. Optimized: Cloudinary, YouTube. Comment in the file flags the three-list lockstep with `next.config.ts` `remotePatterns` and `img-src` CSP.
- New `components/ui/card-thumbnail-grid.tsx` — Server Component grid. 2-up 50/50, 3-up 1-large-left + 2-stacked-right, 4-up 2x2 with `+N` overlay on cell 4. Whole grid wrapped in one outer `<Link>`.
- `components/ui/article-card.tsx` — branches on `images.length >= 2`: render `<CardThumbnailGrid/>`, otherwise `<CardMedia/>`.
- `components/ui/card-media.tsx` — switched to the shared host predicate; added `unoptimized={!shouldOptimizeImage(host)}` so single-hero rendering also serves Tier-1 passthrough hosts.
- `lib/queries/feed.ts` — `attachImagesToRows` does one batched select against `article_media` (kind='image', sort_order ASC), groups in memory, caps 4 per article, fails open on error.
- `lib/queries/bookmarks.ts`, `lib/queries/collections.ts` — append `images: []` (single-hero only at Tier 1).
- `types/article.ts` — `images: CardImage[]` added to `ArticleCardProps`.
- `next.config.ts` — `remotePatterns` extended with 5 Tier-1 hosts; CSP `img-src` mirrors the same list.

### Scope deviation
`article_media` has no `alt` column today. We surface `null` and let the renderer fall back to article-level alt/title. Schema follow-up if accessibility audit demands it.

### Verification
- `npm run build` → exit 0.
- `node scripts/check-bundle-budget.mjs` → `Home=42952B  Detail=38404B`. Phase 14 (Tier 1) delta = +417 B Home, 0 KB new client JS (Server Components throughout). Well under 85/60 KiB caps.
- Manual browser smoke not yet performed — recommend before merging. Need sample articles with multi-image rows on Twitter / Reddit / Imgur / LinkedIn hosts to validate grid + passthrough delivery.

### Phase 14.5 follow-up (~2 weeks)
Wire Cloudinary `image/fetch` proxy: external URLs route through `res.cloudinary.com/{cloud}/image/fetch/...`; `unoptimized={true}` is removed; `remotePatterns` shrinks back to a single entry. Tracked in plan §2.J Tier 2 / §0c.

---

## Remediation Plan — Phase 15 shipped (2026-05-01)

Source plan: `docs/HOMEPAGE_UI_UX_REMEDIATION_PLAN.md` §2.K + §0d (LOCKED 2026-05-01).

### What changed
- New `components/ui/article-content.tsx` — Server Component extracted from the canonical detail route; consumed by both the canonical page and the intercept slot.
- `app/(main)/nuggets/[id]/[slug]/page.tsx` slimmed to a `<Suspense>` + metadata wrapper that renders `<ArticleContent/>`.
- New `components/ui/sheet.tsx` — single `'use client'` island. Bottom sheet on `<lg`, right-anchored side panel on `lg+`. Focus trap, Escape and backdrop close (via `router.back()`), mobile swipe-down dismiss past 80px, body-scroll lock, prior-focus restore. Two-frame RAF mount toggle drives the slide-in transition; `motion-reduce:` snaps.
- `app/(main)/layout.tsx` accepts the `modal` slot prop and renders it alongside `<main>`.
- New `app/(main)/@modal/default.tsx` returning `null` (required so the slot doesn't leak into direct URL hits).
- New `app/(main)/@modal/(.)nuggets/[id]/[slug]/page.tsx` — intercept route rendering `<Sheet>` around `<ArticleContent/>`.

### Scope of the modal-ban lift
Route-pattern-specific. `<Sheet>` is fed by Next 15 parallel slots, not by a context above the grid. The CLAUDE.md "ArticleModal / ArticleDrawer → use /nuggets/[id]/[slug]" rule is overridden only for this route pattern; context-driven modals and the add-to-collection / report / admin-CRUD bans remain in force.

### Verification
- `npm run build` → exit 0. Intercept route registered as `/(.)nuggets/[id]/[slug]`; canonical `/nuggets/[id]/[slug]` preserved.
- `node scripts/check-bundle-budget.mjs` → `Home=42952B  Detail=38404B`. Both unchanged from Phase 14 (Tier 1) baseline. Sheet ships in the intercept-route entrypoint, not on Home or canonical Detail.
- Manual smoke test required before merge — checklist in plan §0d.

---

## Remediation Plan — Phase 11 verified (2026-05-02)

Source plan: `docs/HOMEPAGE_UI_UX_REMEDIATION_PLAN.md` §0e + Phase 11 section (LOCKED plan, amended by audit trail).

### What changed
- **`SEARCH_SUGGEST_ROW_CAP = 8`** exported from `lib/queries/article.ts` (barrel **`lib/queries/index.ts`**) with doc pointers to Blueprint §6.2a and Product §11.
- **`suggestArticles`** uses **`.limit(Math.min(limit, SEARCH_SUGGEST_ROW_CAP))`** so the PMF **8-row** cap cannot be exceeded accidentally by a higher `limit` argument.
- Confirmed suggest path uses **`textSearch` on `search_vector`** (FTS per blueprint), not title **`ilike`** — no change to ranking shape.

### Verification
- **`npm run build`** → exit 0 (this session).
- Optional: **`GET /api/search/suggest?q=…&stream=standard`** → **`suggestions.length ≤ 8`**.

---

## Remediation Plan — Phase 2 shipped (2026-05-02)

Source plan: `docs/HOMEPAGE_UI_UX_REMEDIATION_PLAN.md` **§0f** + Phase 2 section §5.

### What changed
- **`youTubePosterHqUrl`** in `lib/ui/excerpt-card.ts` — `https://i.ytimg.com/vi/{id}/hqdefault.jpg` with **`encodeURIComponent`** on the trimmed `hero_video_id`.
- **`ArticleCard`** builds **`heroThumbForCard`**: non-empty **`hero_thumb_url`** wins; else when **`hero_media_kind === 'youtube'`** and **`hero_video_id`** is non-empty after trim, use the **`hqdefault`** URL.
- **`ytMedia`** includes **`hero_media_kind === 'youtube'`** so the ▶ overlay shows for fallback posters, not only when **`source_url`** is YouTube-mapped.

### Verification
- `npm run build` on agent environment (recommended before tagging).
- Spot-check one published article with **`hero_media_kind = youtube`**, **`hero_video_id`** set, **`hero_thumb_url` null** → card shows YouTube CDN image + overlay.

---

## Remediation Plan — Phase 3 shipped (2026-05-02)

Source plan: `docs/HOMEPAGE_UI_UX_REMEDIATION_PLAN.md` **§0g** + §5 Phase 3.

### What changed
- **`header.tsx`** — logo, search, theme, auth only; removed primary link `<nav>` (including mobile overflow row).
- **`/api/auth/status`** — **`isAdmin: user?.app_metadata?.is_admin === true`**.
- **`header-auth-island.tsx`** — menu links per acceptance; **`/account`** removed.

### Verification
- `npm run build` before release.
- Three-role smoke: anonymous / authenticated reader / **`is_admin`** user.

