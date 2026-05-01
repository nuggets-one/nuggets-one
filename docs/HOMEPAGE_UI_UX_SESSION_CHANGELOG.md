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

## Pending (Not Yet Committed)
Current local changes to include in next commit:
- `components/ui/article-card.tsx`
  - Guard `next/image` usage to avoid invalid/non-image URL crashes (e.g. PDF URLs).
- `next.config.ts`
  - Dev-only CSP `unsafe-eval` allowance to satisfy React dev mode requirements while keeping production CSP strict.
- `components/feed/stream-tabs.tsx`
  - Focus-visible ring polish for keyboard navigation.
- `components/feed/tag-chip-rail.tsx`
  - Focus-visible ring polish for chips and expand/collapse control.
- `components/layout/header-search.tsx`
  - Focus-visible ring polish for clear action and suggestion list items.

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

## Remaining To-Do (Plan Completion)

### 1) Performance regression closure (highest priority)
- [ ] Investigate and resolve Lighthouse regression from best-known snapshot.
- [ ] Reduce `unused-javascript` opportunity in homepage critical path.
- [ ] Improve `server-response-time` for homepage path where feasible.
- [ ] Re-run Lighthouse to establish new stable baseline for launch.

### 2) Final UX consistency sweep
- [ ] Verify card action hierarchy is consistent across:
      `/`, paginated feed, `/bookmarks`, `/collections/[id]`.
- [ ] Validate tag rail collapse/expand behavior with many selected tags.
- [ ] Confirm footer action/meta alignment and readability in all feed contexts.

### 3) Accessibility QA completion
- [ ] Complete keyboard-only navigation pass across homepage controls.
- [ ] Verify reduced-motion behavior in browser with system preference enabled.
- [ ] Run quick contrast pass for active/inactive chips, tabs, and action links.

### 4) Mobile/tablet ergonomic QA
- [ ] Validate sticky header/search/chip behavior on narrow breakpoints.
- [ ] Confirm tap target reliability and absence of overlap/mis-taps.
- [ ] Verify smooth scroll and interaction responsiveness on mobile/tablet.

### 5) Documentation and sign-off package
- [ ] Update this changelog with final commit hashes and final metrics snapshot.
- [ ] Add final pass/fail + known risks section for launch readiness.
- [ ] Link final validation outputs in launch docs/checklist as needed.

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

