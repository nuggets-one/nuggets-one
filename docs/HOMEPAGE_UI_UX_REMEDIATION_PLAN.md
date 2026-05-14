# Homepage UI/UX Remediation Plan

**Status:** LOCKED — design decisions resolved 2026-05-01. **Amended 2026-05-01 (later)** with §2.I–§2.L (markdown JIT, multi-image, sheet/parallel-route detail, typography). **Phases 1, 13, 14 (Tier 1), 15, 16 SHIPPED 2026-05-01.** **Phase 11 verified 2026-05-02** (§0e). **Phase 2 shipped 2026-05-02** (§0f). **Phase 3 shipped 2026-05-02** (§0g). **Phase 4 shipped 2026-05-02** (§0h). **Phase 5 shipped 2026-05-02** (§0i). **Phase 7 shipped 2026-05-02** (§0j). **Phase 8 shipped 2026-05-02** (§0k). **Phase 6 shipped 2026-05-02** (§0l). **Phase 9 shipped 2026-05-02** (§0m). **Phase 10 shipped 2026-05-02** (§0n). Phase 12 deferred (diagnostic-only, awaits real failure data — §0o); **Phase 14.5 follow-up scheduled remote agent** `trig_01SDqvQfNqxCYY7ySpinPrY6` to fire **2026-05-15T03:30:00Z** (Fri 09:00 IST) — see §0p for prompt + handoff contract.
**Author:** Claude (audit + design pass, 2026-05-01)
**Source audit:** in-conversation audit covering L1–L4, S1, C1–C6, SR1, AV1, F1.
**Doc precedence (per `AGENTS.md`):** Migration Plan → Blueprint → Product Behavior & UI → Build Execution → Replication Spec.
**Perf re-evaluation:** see `docs/PERFORMANCE_RULES_REEVALUATION.md` (2026-05-01) — re-derives root causes of the legacy "click-lag" issue and re-validates every perf rule under v2 architecture. Several decisions below are flagged where the perf-grounded reasoning has weakened; UX-grounded reasoning still holds.

---

## 0. Implementation status (read this first)

| Phase | Description | Status | Notes |
|---|---|---|---|
| 1 | P0 visual fixes (L1, L2, L3, C2, C3, C6) | ✅ **DONE 2026-05-01** | One scope deviation — see §0a below |
| 2 | YouTube hero fallback (C1) | ✅ **DONE 2026-05-02** | §0f — `youTubePosterHqUrl` when `hero_thumb_url` empty |
| 3 | Header strip + auth island extension | ✅ **DONE 2026-05-02** | §0g — PRODUCT §3.3 / §2.B |
| 4 | Stream tabs restyle + mobile bottom nav | ✅ **DONE 2026-05-02** | §0h · magazine tabs + **`MobileBottomNav`** |
| 5 | Site footer | ✅ **DONE 2026-05-02** | §0i — `legal_pages` + `Footer` + `/legal/contact` |
| 6 | YouTube state machine on detail | ✅ **DONE 2026-05-02** | §0l — facade poster + lazy iframe + `youtube-seek` event |
| 7 | Card source badge | ✅ **DONE 2026-05-02** | §0j — top-right pill on media; footer `Source:` link removed |
| 8 | Share button (card + detail) | ✅ **DONE 2026-05-02** | §0k — `navigator.share` → clipboard fallback with inline label |
| 9 | Active filters bar | ✅ **DONE 2026-05-02** | §0m — `ActiveFiltersBar` between rail + grid; removable pills + Clear all |
| 10 | Filter popover + tag counts | ✅ **DONE 2026-05-02** | §0n — `FilterPopover` end-of-rail trigger + `<dialog>` + `getTagCountsForStream` |
| 11 | Suggest cap verification | ✅ **DONE 2026-05-02** | Verified + hard cap — see §0e |
| 12 | Infinite scroll diagnostic | ⏸ DEFERRED | §0o — diagnostic-only; awaits real failure data |
| 13 | Card-excerpt markdown JIT (§2.I) | ✅ **DONE 2026-05-01** | Server-only via query layer; cache keyed on content hash (deviation — see §0b) |
| 14 | Multi-image card rendering (§2.J) — Tier 1 | ✅ **DONE 2026-05-01** | Feed-only; bookmarks/collections stay single-hero. See §0c. **Phase 14.5 scheduled** — remote agent `trig_01SDqvQfNqxCYY7ySpinPrY6` fires 2026-05-15T03:30:00Z; see §0p. |
| 15 | Sheet/parallel-route detail (§2.K) | ✅ **DONE 2026-05-01** | See §0d. Smoke checklist must pass before merge. |
| 16 | Card typography + componentization (§2.L) | ✅ **DONE 2026-05-01** | Card decomposed into media/body/footer; body `text-sm leading-snug tracking-tight`; CTA → quiet `rounded-full` pill |

### 0a. Phase 1 — what shipped, what deviated

**Shipped (build green, bundle within budget):**
- **L2** — `app/(main)/layout.tsx`: `max-w-[90rem]` → `max-w-[1800px]`.
- **L1** — grid breakpoints `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` in `app/(main)/page.tsx`, `components/feed/feed-pager.tsx` (both grid blocks), `components/feed/feed-skeleton.tsx`. Note: 2-col now triggers at `md` (768px), not `sm` (640px), per locked acceptance criteria.
- **L3** — `components/feed/tag-chip-rail.tsx` rewritten:
  - Dropped `expanded` state, `COLLAPSED_TAG_LIMIT`, "Show more (N)" expand-in-place button.
  - Single horizontal scroll lane (`flex-nowrap` + `overflow-x-auto`).
  - Native scrollbar hidden (`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`).
  - Left/right edge fade gradients via `ResizeObserver` + scroll listener — visible **only** when content overflows and scroll is not at that edge.
- **C2** — `lib/ui/excerpt-card.ts` `formatExcerptForCard` extended:
  - Strips: image markdown, link markdown (existing), `[[ts]]` / `[[N]]` markers, `**bold**`, `__bold__`, `~~strike~~`, `*italic*`, underscore italic (with snake_case guard), inline `` `code` ``, leading line markers (`#`, `-`, `*`, `+`, `>`, `1.`), bare URLs (host or short path).
  - Truncates to 120 chars with word-boundary-safe ellipsis (caller can override via second arg).
  - Default `maxLen = 120`; `ArticleCard` uses default.
- **C6** — `components/ui/article-card.tsx`: date moved from top meta row to footer meta row, right-aligned via `ml-auto` on the date span; bookmark sits to its right.
- **C3** — `components/ui/article-card.tsx`:
  - Defensive tag filter: `tag_slugs.filter(t => t !== 'nuggets' && t !== 'pulse')` → `displayTagSlugs`.
  - `+N` overflow pill renders when `displayTagSlugs.length >= 3`. Viewport-conditional count: `+{length-1}` at `<lg` (only primary visible), `+{length-2}` at `≥lg` (primary + secondary visible).

**Deviation — `More (N)` placeholder chip on rail: deferred to Phase 10.**
The locked plan called for a placeholder `More (N)` chip at the end of the rail in Phase 1, with the popover wired in Phase 10. We **did not ship the placeholder**. Reason: per `CLAUDE.md` rule *"No half-finished implementations,"* a chip with a no-op handler trains users on a feature that doesn't exist and costs accessibility / focus order without delivering value. Phase 10 will add the chip **and** the popover together as one coherent unit. This is a tighter interpretation of the same intent.

**Verification performed:**
- `npm run build` → exit 0 (Next.js 16.2.4 Turbopack, 20 static pages generated, TypeScript clean).
- `node scripts/check-bundle-budget.mjs` → `Home=42601B  Detail=38404B` — well under the 85/60 KiB caps.
- Manual browser check: not yet performed in this session — recommend smoke-test of `/`, `/?stream=pulse`, `/?tags=macro`, and a mobile viewport before merging.

**Files touched in Phase 1:**
```
app/(main)/layout.tsx
app/(main)/page.tsx
components/feed/feed-pager.tsx
components/feed/feed-skeleton.tsx
components/feed/tag-chip-rail.tsx
lib/ui/excerpt-card.ts
components/ui/article-card.tsx
```

### 0b. Phases 16 + 13 — what shipped, what deviated

**Phase 16 shipped 2026-05-01 (build green, Home=42,535B / 85 KiB budget):**
- Decomposed `components/ui/article-card.tsx` (~219 lines) into:
  - `components/ui/article-card.tsx` (orchestrator, ~75 lines)
  - `components/ui/card-media.tsx` (Link + Image + YouTube overlay + gradient placeholder; exports `canRenderWithNextImage` for Phase 14 reuse)
  - `components/ui/card-body.tsx` (tags + title + excerpt HTML render)
  - `components/ui/card-footer.tsx` (CTA pill + source link + date + bookmark)
- Body type: `text-sm leading-snug tracking-tight` (was `text-sm leading-relaxed`).
- Tag pills: `px-1.5 py-0.5` (was `px-2 py-0.5`).
- "View Full Article" CTA: `rounded-full px-3 py-1 text-xs font-medium ... hover:bg-surface-raised` (was inline `rounded-md` text link).
- Footer container: own `px-4 py-2 border-t` (was inheriting parent `p-4`).
- Server Components throughout. No new client islands.

**Phase 13 shipped 2026-05-01 (build green, Home=42,535B unchanged from Phase 16):**
- Installed `rehype-sanitize`, `rehype-stringify`. `unified` / `remark-parse` / `remark-rehype` already transitives.
- New `lib/ui/excerpt-markdown.ts`:
  - Strict sanitize allowlist: `p, em, strong, code, a, ul, ol, li, blockquote, br`.
  - `a[href]` only; protocols restricted to `http, https, mailto`. No `target` / `rel` (opens inline; rare in card body anyway since outer `<Link>` intercepts clicks).
  - Input truncation at 600 chars at word boundary before parse.
  - Cache via `unstable_cache(['excerpt-html', sha1(content).slice(0,12)], { revalidate: 86400 })`.
  - `attachExcerptHtml<T>(rows): Promise<T & { excerptHtml: string }[]>` helper used by all three query paths.
- `getFeedPage`, `getBookmarkedArticles`, `getCollectionById` all run rows through `attachExcerptHtml` before returning.
- `ArticleCardProps.excerptHtml: string` added to type.
- `<CardBody>` renders via `dangerouslySetInnerHTML` inside a div with Tailwind arbitrary descendant selectors (`[&_p]:m-0 [&_strong]:font-semibold [&_em]:italic [&_code]:rounded ...`) — no `@tailwindcss/typography` dep.
- Removed unused `formatExcerptForCard` from `lib/ui/excerpt-card.ts` (file exported **`isYouTubeUrl`** at Phase 13 ship; **`youTubePosterHqUrl`** added later — **Phase 2 / §0f**).

**Deviation from §2.I — cache key changed from `id+updated_at` to content hash.**
The plan called for `unstable_cache(['excerpt-html', id, updated_at])`. Investigation showed `articles.updated_at` is not auto-bumped on admin update — there's only the `published_at` freeze trigger, and `lib/actions/admin.ts` `updateArticleAction` does not write `updated_at`. Using `id+updated_at` as the key would cache stale HTML across edits. Three options were weighed:
1. Add a Postgres `BEFORE UPDATE` trigger to bump `updated_at` (requires migration + admin coordination).
2. Modify `updateArticleAction` to write `updated_at` on every save (works but couples the cache layer to the action).
3. Key on a content hash of the markdown itself — content change → key change → cache miss → re-render. No DB or admin coordination required.

Chose (3). The cache invalidates *exactly* when the content changes, which is the only correctness concern. Option (1) remains the right long-term fix if other code paths grow to depend on `updated_at` semantics; tracked as a follow-up.

**Files touched in Phase 16:**
```
components/ui/article-card.tsx
components/ui/card-media.tsx (new)
components/ui/card-body.tsx (new)
components/ui/card-footer.tsx (new)
```

**Files touched in Phase 13:**
```
package.json (rehype-sanitize, rehype-stringify)
lib/ui/excerpt-markdown.ts (new)
lib/ui/excerpt-card.ts (dropped formatExcerptForCard)
lib/queries/feed.ts
lib/queries/bookmarks.ts
lib/queries/collections.ts
types/article.ts (added excerptHtml: string)
components/ui/article-card.tsx (consume excerptHtml prop)
components/ui/card-body.tsx (render via dangerouslySetInnerHTML)
```

### 0c. Phase 14 (Tier 1) — what shipped

**Phase 14 Tier 1 shipped 2026-05-01 (build green, Home=42,952B / 85 KiB budget):**
- New `lib/ui/is-image-url.ts` — port of `docs/CARD_MEDIA_IMAGE_URL_PATTERNS.md` §1–6 heuristics; pure server-safe `isImageUrl(url)`.
- New `lib/ui/card-image-host.ts` — single source of truth for host gating: `canRenderWithNextImage(url)`, `shouldOptimizeImage(host)`, `safeHostname(url)`. Tier-1 passthrough hosts: `pbs.twimg.com`, `i.redd.it`, `preview.redd.it`, `i.imgur.com`, `media.licdn.com`. Optimized hosts (no `unoptimized`): `res.cloudinary.com`, `i.ytimg.com`.
- New `components/ui/card-thumbnail-grid.tsx` — Server Component grid (2/3/4-up + `+N` overlay) for `images.length >= 2`.
- `lib/queries/feed.ts` — added `attachImagesToRows`: single batched select against `article_media` (kind='image', sort_order ASC), grouped in memory by `article_id`, capped at 4 per article. URLs filtered through `isImageUrl`. Fail-open on error (cards fall back to single-hero).
- `lib/queries/bookmarks.ts`, `lib/queries/collections.ts` — append `images: []` to satisfy the new required prop. Multi-image is feed-only at Tier 1.
- `types/article.ts` — added `images: CardImage[]` to `ArticleCardProps`; added `CardImage` type.
- `components/ui/article-card.tsx` — branches on `images.length >= 2`: `<CardThumbnailGrid/>` when true, `<CardMedia/>` (single hero) otherwise.
- `components/ui/card-media.tsx` — dropped local `canRenderWithNextImage` in favor of the lib version; added `unoptimized={!shouldOptimizeImage(host)}` so external Tier-1 hosts can render as single hero too (not just in the grid).
- `next.config.ts` — `images.remotePatterns` extended with the 5 Tier-1 hosts; CSP `img-src` directive mirrors the same list. Drift between these three lists (lib predicate, remotePatterns, CSP) will break rendering — comment in `card-image-host.ts` flags it.

**Deviation from §2.J — `article_media` rows have no `alt` column today.**
The schema has `article_media (article_id, url, sort_order, kind, ...)` but no `alt`. We surface `null` and let the card renderer fall back to article-level alt/title. Adding an `alt` column is a follow-up if accessibility audit demands it.

**Files touched in Phase 14 (Tier 1):**
```
lib/ui/is-image-url.ts (new)
lib/ui/card-image-host.ts (new)
components/ui/card-thumbnail-grid.tsx (new)
components/ui/card-media.tsx (use shared host predicate)
components/ui/article-card.tsx (branch to grid when ≥2 images)
lib/queries/feed.ts (attachImagesToRows + select)
lib/queries/bookmarks.ts (images: [])
lib/queries/collections.ts (images: [])
types/article.ts (images, CardImage)
next.config.ts (remotePatterns + CSP img-src)
```

**Verification performed:**
- `npm run build` exit 0; TypeScript clean; 20 static pages generated; Next.js 16.2.4 Turbopack.
- `node scripts/check-bundle-budget.mjs` → Home=42,952B, Detail=38,404B — well under 85/60 KiB caps. Phase 14 added ~417 B to Home, all from Server Component additions; 0 KB new client JS.
- Manual browser smoke: not yet performed in this session — recommend before merging Phase 14 (Tier 1) PR. Sample articles needed: one with `article_media.kind='image'` rows (2/3/4 images) on Twitter / Reddit / Imgur / LinkedIn hosts, one with a single hero on each of those hosts, one Cloudinary-only article (regression baseline).

**What's queued for Phase 14.5 (~2 weeks out):**
- Helper `cloudinaryFetchUrl(externalUrl, opts)` constructing `res.cloudinary.com/{cloud}/image/fetch/f_auto,q_auto,w_{width}/{encoded}`.
- `<CardThumbnailGrid/>` + `<CardMedia/>` switch external URLs through that helper; drop `unoptimized={true}`.
- `next.config.ts` `remotePatterns` shrinks back to single entry (`res.cloudinary.com`); CSP `img-src` follows.
- `lib/ui/card-image-host.ts` becomes effectively a one-host predicate.

### 0d. Phase 15 — what shipped

**Phase 15 shipped 2026-05-01 (build green, Home=42,952B / Detail=38,404B unchanged — sheet ships on the intercept route entrypoint, not the home or canonical-detail bundles):**
- New `components/ui/article-content.tsx` (Server Component) — extracted from `app/(main)/nuggets/[id]/[slug]/page.tsx`. Same render surface, same slug-canonicalize `permanentRedirect` (close-and-redirect from inside the sheet works because `permanentRedirect` traverses to the canonical URL, exiting the parallel slot).
- Canonical route `app/(main)/nuggets/[id]/[slug]/page.tsx` slimmed to the `<Suspense>` + metadata wrapper + `<ArticleContent/>` consumer.
- New `components/ui/sheet.tsx` (`'use client'`, single client island) — bottom sheet on `<lg`, right-anchored side panel on `lg+`. Focus trap (cycles tab inside the panel), Escape closes via `router.back()`, backdrop click closes, swipe-down on mobile dismisses past 80px. Two-frame `requestAnimationFrame` mount toggle drives a `translate-y-full → translate-y-0` (or `translate-x-full → translate-x-0` desktop) transition; `motion-reduce:` snaps without slide. Body scroll locked while open; prior focus restored on unmount.
- `app/(main)/layout.tsx` accepts the `modal` slot prop and renders it after `<main>`.
- New `app/(main)/@modal/default.tsx` returning `null` — required so the slot doesn't leak into direct URL hits.
- New `app/(main)/@modal/(.)nuggets/[id]/[slug]/page.tsx` — interceptor; renders `<Sheet>` containing the same `<ArticleContent/>` used by the canonical page.

**Why this is the scoped lift, not a blanket modal ban lift:** the lift is *route-pattern-specific*. `<Sheet>` consumes a route via parallel slots; it is not a `<ModalProvider>` above the grid. The v1 click-lag failure mechanism (FilterStateContext cascade above a fully-hydrated client tree) is structurally absent. Other modal bans (add-to-collection, report, admin CRUD) remain in force.

**Files touched in Phase 15:**
```
app/(main)/layout.tsx (modal slot prop)
app/(main)/nuggets/[id]/[slug]/page.tsx (consumes extracted ArticleContent)
app/(main)/@modal/default.tsx (new)
app/(main)/@modal/(.)nuggets/[id]/[slug]/page.tsx (new)
components/ui/article-content.tsx (new — extracted Server Component)
components/ui/sheet.tsx (new — single client island)
```

**Smoke test required before merge** (per §2.K):
- Click card from `/?stream=pulse&tags=macro` → sheet opens; URL `/nuggets/[id]/[slug]`; grid behind preserved; scroll position preserved.
- Press Escape → sheet closes; URL returns to `/?stream=pulse&tags=macro`; scroll preserved; filters preserved.
- Backdrop click closes sheet.
- Click another card while sheet open → first sheet closes, second opens.
- Direct URL paste of `/nuggets/[id]/[slug]` in fresh tab → canonical full page renders, no sheet.
- Browser back → closes sheet; forward → reopens sheet.
- Filter change from chip rail with sheet open → grid behind re-fetches; sheet stays open.
- Reduced-motion: sheet snaps without animation.
- Mobile (`<lg`): sheet anchors bottom; swipe-down past 80px dismisses.
- Tab cycles inside sheet (focus trap).
- Body scroll locked while sheet open.

**Rollback:** revert the Phase 15 commit. `@modal` slot returns to a `null` default; intercept route file removed; canonical route stops consuming the extracted `<ArticleContent/>` (or keeps consuming it — either is fine).

**Verification performed:**
- `npm run build` exit 0; TypeScript clean.
- `node scripts/check-bundle-budget.mjs` → Home=42535B, Detail=38404B — well under 85/60 KiB caps. Phase 13 added 0 KB to client (server-only).
- Manual browser smoke: not yet performed in this session — recommend before merging Phase 16+13 PR.

### 0e. Phase 11 — suggest row cap verified (2026-05-02)

**Outcome:** **`suggestArticles`** already applied `.limit` with default **8**; enforcement is now explicit for audit and future callers.

**What changed (engineering):**
- `lib/queries/article.ts` exports **`SEARCH_SUGGEST_ROW_CAP = 8`** with citations to **`NUGGETS_V2_BLUEPRINT.md` §6.2a** and **`NUGGETS_V2_PRODUCT_BEHAVIOR_AND_UI.md` §11**.
- Query uses **`.limit(Math.min(limit, SEARCH_SUGGEST_ROW_CAP))`** so no caller can exceed the frozen cap without changing this constant.

**Search shape (verification, no change required):**
- Suggestions filter via **`textSearch('search_vector', …)`** (weighted **`tsvector`** per blueprint §6.2 / DDL), not **`ilike('%q%', title)`**. The phased plan’s one-line **`ilike` spot-check** was a diagnostic prompt; authoritative contract is FTS on **`search_vector`** per blueprint.

**Files touched:** `lib/queries/article.ts`, `lib/queries/index.ts` (re-export `SEARCH_SUGGEST_ROW_CAP`).

**Manual API check (recommended for PR notes):** `GET /api/search/suggest?q=ab&stream=standard` → **≤ 8** objects in **`suggestions`**.

**Automated check:** `npm run build` → exit 0 (2026-05-02).

### 0f. Phase 2 — YouTube hero fallback (C1) — shipped 2026-05-02

**Scope:** When `hero_media_kind === 'youtube'`, `hero_video_id` is set, and **`hero_thumb_url` is absent or whitespace-only**, the card passes **`https://i.ytimg.com/vi/{id}/hqdefault.jpg`** into `<CardMedia/>` (implemented as `youTubePosterHqUrl` + `encodeURIComponent` on the trimmed id). Non-YouTube rows and articles with a stored thumb are unchanged.

**Files:** `components/ui/article-card.tsx`, `lib/ui/excerpt-card.ts` (shared URL helper next to `isYouTubeUrl`).

**`ytMedia` / play overlay:** `hero_media_kind === 'youtube'` is included in **`ytMedia`** so the poster + ▶ treatment applies for the fallback thumb, not only when `source_url` is a YouTube host.

### 0g. Phase 3 — header strip + auth island (2026-05-02)

**Outcome:** Masthead aligns with **`PRODUCT` §3.3 / plan §2.B** — **`Home` / `Collections` / `Create nugget`** removed from header chrome; destinations for signed-in readers move into the avatar menu (and **`Create nugget`** + **`Admin`** gate on **`app_metadata.is_admin`**). Mobile inline nav row under the header removed in this phase; **`MobileBottomNav`** landed in **Phase 4 (§0h)**.

**What shipped:**
- **`components/layout/header.tsx`** — logo + **`HeaderSearch`** + theme + **`HeaderAuthIsland`** only (no `<nav>` link rows).
- **`app/api/auth/status/route.ts`** — adds **`isAdmin: user?.app_metadata?.is_admin === true`** (same predicate as **`app/admin/layout.tsx`** / **`updateArticleAction`**).
- **`components/layout/header-auth-island.tsx`** — consumes **`isAdmin`**; menu: **Bookmarks**, **Collections**, **Admin** + **Create nugget** when admin, **Legal** block + **Sign out**; **`/account`** link dropped.

**Files:** `components/layout/header.tsx`, `components/layout/header-auth-island.tsx`, `app/api/auth/status/route.ts`.

**Verification (2026-05-02):** `npm run build` exit 0; **`node scripts/check-bundle-budget.mjs`** → `Home=43117B` `Detail=38472B` (within 85/60 KiB caps).

**Follow-up UX (superseded by §0h Phase 4):** Below **`lg`**, destinations use **`MobileBottomNav`** + avatar menu; **`/collections`** URLs remain valid.

---

### 0h. Phase 4 — magazine stream tabs + mobile bottom nav (2026-05-02)

**(a)** **`StreamTabs`** restyled (**§2.A**): text-only **`text-muted`**, active **`text-primary`** + **`border-b-2 border-accent`**; removed pill segmented control; **`-mx-4`/`-mx-6`** + **`border-b`** strip on **`/`** aligns with **`main`** gutters.

**(b)** **`MobileBottomNav`**: **`lg:hidden`** fixed bar — **Nuggets** (`/?stream=standard`), **Pulse** (`/?stream=pulse`), **Collections** (`/collections` + subroutes), **Bookmarks** (`/bookmarks` — anonymous hits follow existing **`redirect`** to **`/login?next=/bookmarks`**); active highlight from **`usePathname()` + `useSearchParams()`** (**`stream`** on **`/`**); **`Link`** uses **`scroll={false}`** for stream hops.

**(c)** **`app/(main)/layout.tsx`**: **`main`** **`pb-20`** on small screens (**`lg:pb-6`**) clears the bottom bar + **`Suspense`** wrapper for **`useSearchParams`**.

**Files:** `components/feed/stream-tabs.tsx`, `components/layout/mobile-bottom-nav.tsx` (new), `app/(main)/layout.tsx`, `app/(main)/page.tsx`.

**Verification (2026-05-02):** `npm run build` exit 0; **`node scripts/check-bundle-budget.mjs`** → **`Home=43534B` `Detail=38839B`** — within caps.

---

### 0i. Phase 5 — site footer (M1) — shipped 2026-05-02

**(a)** **`legal_pages`** table + RLS `SELECT USING (true)` + seed rows (**terms**, **privacy**, **contact**); `GRANT SELECT` to **`anon`** / **`authenticated`**.

**(b)** **`listLegalFooterLinks()`** — single `.select('slug, label').order('sort_order')`; hard-coded fallback if the query fails or the table is empty.

**(c)** **`components/layout/footer.tsx`** — disclaimer line (`text-xs text-muted`), `<nav>` of `next/link` to **`/legal/[slug]`**, © **Nuggets** line. Wrapped in **`Suspense`** in **`app/(main)/layout.tsx`** with a skeleton fallback.

**(d)** **`app/(main)/layout.tsx`** — outer **`div`** **`pb-20 lg:pb-6`** wraps **`main`** + footer so **`MobileBottomNav`** does not cover the footer on small viewports (**main** loses bottom padding; footer inherits column clearance).

**(e)** New **`app/(main)/legal/contact/page.tsx`** placeholder (terms/privacy unchanged).

**Files:** `supabase/migrations/20240001000008_legal_pages.sql`, `lib/queries/legal-pages.ts`, `lib/supabase/types.ts` (**`legal_pages`** row stub), `components/layout/footer.tsx`, `app/(main)/layout.tsx`, `app/(main)/legal/contact/page.tsx`.

**Verification (2026-05-02):** `npm run build` exit 0; `node scripts/check-bundle-budget.mjs` → **`Home=43534B` `Detail=38839B`** — within caps (unchanged vs §0h).

---

### 0j. Phase 7 — card source badge (C5.2) — shipped 2026-05-02 (`887b2c0`)

**Outcome:** Source attribution moved from the duplicate footer `Source: host ↗` link to a single top-right pill overlaying the media block (per plan §7 / §2.L line 526). Dual surfaces collapsed to one.

**What shipped:**
- New `components/ui/card-source-badge.tsx` (Server Component) — `bg-black/60 backdrop-blur-sm`, `text-[10px]` per spec, `aria-label` for screen readers, `target="_blank" rel="noopener noreferrer"`.
- `components/ui/card-media.tsx` and `components/ui/card-thumbnail-grid.tsx` — restructured so the wrapping `<Link>` is now a child of a `relative aspect-video` div; the badge sits as a sibling `<a>` to avoid nested anchors. Both single-hero and multi-image cards render the badge.
- `components/ui/article-card.tsx` — passes `sourceHost` + `source_url` to media components instead of footer.
- `components/ui/card-footer.tsx` — dropped the `Source:` link block and its now-unused props.

**Files:** new `components/ui/card-source-badge.tsx`; modified `components/ui/card-media.tsx`, `components/ui/card-thumbnail-grid.tsx`, `components/ui/article-card.tsx`, `components/ui/card-footer.tsx`.

**Verification (2026-05-02):** `npm run build` exit 0; `node scripts/check-bundle-budget.mjs` → **`Home=43763B`** (+229 B vs §0i; well under 85 KiB cap), Detail unchanged. `tsc --noEmit` clean.

---

### 0k. Phase 8 — share button (M5 + 2.G — both surfaces) — shipped 2026-05-02

**Outcome:** Single `'use client'` island serves card and detail. `navigator.share` preferred; clipboard fallback shows inline `Copied!` / `Copy failed` for 1.5 s.

**What shipped:**
- New `components/ui/share-button.tsx` — feature-detects `navigator.share`; constructs absolute URL on the client via `window.location.origin + href`; placeholder telemetry via `console.log('[telemetry]', { event: 'share_initiated', surface, channel })` until a real telemetry helper lands; `aria-live="polite"` for status announcements; `e.preventDefault()` + `e.stopPropagation()` so the click doesn't bubble to surrounding card surfaces; `setTimeout` cleanup on unmount.
- `components/ui/card-footer.tsx` — accepts `title` prop; renders `<ShareButton variant="card" />` adjacent to the bookmark button, matching the icon-only style.
- `components/ui/article-card.tsx` — threads `title` through to `CardFooter`.
- `components/ui/article-content.tsx` — renders `<ShareButton variant="detail" />` next to the detail-page bookmark with explicit pill label.

**Files:** new `components/ui/share-button.tsx`; modified `components/ui/article-card.tsx`, `components/ui/card-footer.tsx`, `components/ui/article-content.tsx`.

**Verification (2026-05-02):** `npm run build` exit 0; `node scripts/check-bundle-budget.mjs` → **`Home=44194B`** (+431 B), **`Detail=39304B`** (+442 B) — under plan §8 budget of <2 KiB per surface and well within 85/60 KiB caps. AbortError on user-cancelled `navigator.share` is silently swallowed — no clipboard fallback after explicit dismiss.

---

### 0l. Phase 6 — YouTube state machine on detail — shipped 2026-05-02

**Outcome:** Detail-page hero for YouTube articles is now a facade — poster image (LCP element) with a play overlay; iframe is **not in the DOM** until first user gesture. Body timestamp links of the form `[label](#yt=N)` mount the iframe on demand and seek to the requested second; subsequent timestamp clicks `postMessage` `seekTo` to the live iframe. Outbound `Watch on YouTube ↗` link is rendered at all times.

**What shipped:**
- New `components/ui/youtube-player.tsx` (`'use client'`) — exports `YOUTUBE_SEEK_EVENT` and a `YouTubeSeekDetail` type. State machine: `poster` ↔ `embed`. Poster click mounts `<iframe src="https://www.youtube-nocookie.com/embed/{id}?enablejsapi=1&rel=0&autoplay=1">`. Cold-mount via timestamp click adds `&start=N`; warm-seek uses `iframe.contentWindow.postMessage(JSON.stringify({event:'command',func:'seekTo',args:[seconds,true]}), 'https://www.youtube-nocookie.com')`. Window-level event listener for `youtube-seek`. Container `scrollIntoView` after seek. Telemetry placeholder per plan §6.3a follow-up: `console.log('[telemetry]', { event: 'youtube_play', video_id, seconds, source })` with `source: 'poster' | 'timestamp'`.
- New `components/ui/timestamp-link-interceptor.tsx` (`'use client'`) — single click handler with event delegation; matches anchors whose `href` starts with `#yt=` and a non-negative integer; dispatches `youtube-seek` with `{ seconds }`. Other anchor clicks pass through unchanged. Wraps `<ArticleBody/>` only when the article has a YouTube hero.
- `components/ui/article-content.tsx` — when `article.hero_media_kind === 'youtube' && article.hero_video_id`, renders `<YouTubePlayer/>` instead of the existing `<Image>` hero; poster URL falls back to `youTubePosterHqUrl(hero_video_id)` when `hero_thumb_url` is absent or whitespace; body is wrapped in `<TimestampLinkInterceptor>`.

**CSP:** already covers `frame-src https://www.youtube.com https://www.youtube-nocookie.com` and `img-src ... https://i.ytimg.com` (next.config.ts §S11-F1); no edits required.

**Files:** new `components/ui/youtube-player.tsx`, new `components/ui/timestamp-link-interceptor.tsx`; modified `components/ui/article-content.tsx`.

**Verification (2026-05-02):** `npm run build` exit 0; `node scripts/check-bundle-budget.mjs` → **`Home=44194B`** (unchanged — YT components ship only on detail), **`Detail=40615B`** (+1311 B vs §0k; well under 60 KiB cap). `tsc --noEmit` clean. LCP element on detail = poster `<Image priority>` (iframe is not in the initial DOM).

**Manual smoke matrix (recommended before merge):** sample articles with (a) YT hero + body timestamps, (b) YT hero + no timestamps, (c) image hero + body timestamps that should be ignored, (d) YT hero with `hero_thumb_url = null` (verify `hqdefault` fallback). On each: poster paints, ▶ overlay visible, iframe absent until first click; click poster → autoplay starts; click `[label](#yt=120)` in body → embed mounts/seeks and scrolls into view; subsequent timestamp click while embed is mounted → seekTo postMessage works (verify in DevTools Console, not Network).

**Follow-up:** wire real telemetry POST when the helper exists — replace `console.log('[telemetry]', …)` in both `youtube-player.tsx` and `share-button.tsx`.

---

### 0m. Phase 9 — active filters bar (M3) — shipped 2026-05-02

**Outcome:** Removable filter pills now sit between the chip rail and the grid, with a right-aligned **Clear all** action. Renders only when `tags.length > 0 || q.length > 0` (stream alone does not count). Result-summary line trimmed to `{N results} | {streamLabel}` since search/tag context is conveyed by the pills.

**What shipped:**
- New `components/feed/active-filters-bar.tsx` (`'use client'`) — reads `tags` + `q` via `useQueryState({ shallow: false })`; renders `Search: "{q}" ×` pill + one pill per selected tag (label resolved from `TagSummary[]`, slug fallback). Each pill is a `<button>` with `aria-label` for screen readers; click removes that single filter (`startTransition` + `setTagsParam(next.length ? next.join(',') : null)` / `setQ(null)`). **Clear all** writes `null` to both params; `stream` is preserved automatically (different nuqs key).
- `app/(main)/page.tsx` — imports and mounts `<ActiveFiltersBar tags={officialTags}/>` between `<TagChipRail/>` and the result-summary line. Summary line trimmed: dropped `Search: "{q}"` and `{N} tag filter{s}` parts (now duplicated by the bar) — kept `{resultLabel} | {streamLabel}`.

**Why this matches plan §9 / M3 contract:**
- Position: between chip rail and grid; not sticky. ✓
- Removable pill per active filter (`Search: "..." ×`, `{label} ×`). ✓
- Right-aligned **Clear all**, clears `tags` + `q`, preserves `stream`. ✓
- All wiring via `nuqs` — no new state. ✓
- Renders only when filters are active. ✓

**Files:** new `components/feed/active-filters-bar.tsx`; modified `app/(main)/page.tsx`.

**Verification (2026-05-02):** `npm run build` exit 0; `node scripts/check-bundle-budget.mjs` → **`Home=44527B`** (+333 B vs §0l), **`Detail=40615B`** (unchanged — bar ships only on Home). Within 85/60 KiB caps.

**Manual smoke (recommended before merge):**
- `/?q=taiwan` → `Search: "taiwan" ×` pill + Clear all visible; click ×, q clears, bar disappears.
- `/?tags=macro,markets` → two tag pills + Clear all; click one × → only that tag removed; click Clear all → both removed.
- `/?stream=pulse&tags=macro&q=fed` → stream preserved through Clear all; URL becomes `/?stream=pulse`.
- Anonymous + signed-in: identical (no auth coupling).
- Reduced-motion: no animation regressions (pills are static, text-only buttons).
- Keyboard: Tab cycles into each pill; Enter / Space removes; focus visible (`focus-visible:ring-2`).

---

### 0n. Phase 10 — filters popover + tag counts (F1, flat) — shipped 2026-05-02

**Outcome:** End-of-rail `More (N)` chip opens a native `<dialog>` listing every official tag with its published-article count. Search-within-tags input + flat checkbox list (no dimension grouping) + Apply / Cancel / Clear. Selection is staged locally and committed to the `tags` nuqs param on Apply only — Cancel / Esc / backdrop click discard pending changes.

**What shipped:**
- New `lib/queries/tag-counts.ts` — `getTagCountsForStream(stream)` returns `Record<slug, count>`. In-memory aggregation over `articles.tag_slugs` for `status='published'` rows in the active stream; cached via two `unstable_cache` entries (`['tag-counts','standard']`, `['tag-counts','pulse']`) with `revalidate: 3600`. PostgREST schema-cache misses (`PGRST205` / `42P01`) fail open with `{}`.
- New `components/feed/filter-popover.tsx` (`'use client'`) — owns both the `More (N)` trigger button (chip-styled) and the `<dialog>`. Trigger fires `dialogRef.current.showModal()`; close fires `dialogRef.current.close()`. `Escape` close + focus trap come from the native dialog top-layer behaviour. Backdrop click is detected by `e.target === dialogRef.current`. On open, local state syncs from the URL (`useQueryState('tags', { shallow: false })`) and the search input is auto-focused next animation frame. Apply commits via `startTransition(() => setTagsParam(...))`; Cancel discards. Clear button (footer) zeroes local selection; disabled when nothing is selected. Apply is disabled until the selection has actually changed.
- `components/feed/tag-chip-rail.tsx` — accepts optional `counts?: TagCounts` prop and renders `<FilterPopover/>` as the last item in the scroll lane. No expand-in-place behaviour was ever shipped (Phase 1 §0a deviation), so no removal needed.
- `app/(main)/page.tsx` — fetches `getTagCountsForStream(stream)` in parallel with feed + official tags; passes to `<TagChipRail counts={tagCounts}/>`.

**Why this matches plan §10 / §2.D contract:**
- Trigger appears at end of rail (`More (N)`) — the chip layout reuses the existing `flex-nowrap` scroll lane. ✓
- Flat checkbox list, no dimension grouping. ✓
- Apply commits to URL (`startTransition` so the RSC re-render streams in). ✓
- Clear resets local selection (Apply still required to commit). ✓
- Tag counts inline (`{label}` + right-aligned `{count}`). ✓
- Search-within-tags input filters on label + slug substring (case-insensitive). ✓
- `nuqs`-only state for the URL; local React state for the unconfirmed selection. ✓
- Focus trap on open + restore focus to trigger on close (native dialog handles trap; component re-focuses trigger explicitly on `closeDialog`). ✓
- Mobile sheet: same dialog rendered as a fixed bottom panel via Tailwind overrides (`fixed inset-x-0 bottom-0 rounded-t-2xl max-h-[80vh]`). ✓ Backdrop click closes (no swipe-down dismiss — see deviation below).

**Deviations from §2.D / §10 spec:**
1. **Counts query — JS aggregation instead of `select unnest(tag_slugs), count(*) ... group by 1`.** Reason: PostgREST does not expose `unnest` aggregation, and the public anon role cannot run arbitrary SQL. The literal SQL would require a Postgres function + a migration, which §2.D did not pre-authorize. The JS aggregation is equivalent in correctness, has identical caching semantics, and ships zero new schema. Cost is one `select tag_slugs from articles where status='published' and content_stream=$1` per stream per cache miss (≤ 1/h), which is small at PMF scale (a few thousand string-array rows). If feed grows to where this becomes costly, the follow-up is to ship an RPC + replace the body of `fetchTagCountsForStream`.
2. **Desktop placement — centered modal instead of "anchored popover".** Reason: CSS anchor-positioning support is still uneven across browsers (esp. older Safari / Firefox versions in the supported matrix), and a portal-free anchored popover via JS-computed `getBoundingClientRect` fights the native `<dialog>::showModal()` top-layer auto-centering. A centered modal preserves the spec's intent (flat list, search, Apply/Clear, focus trap, no portal lib) and matches mobile bottom-sheet behaviour conceptually (one dialog component, two layouts via Tailwind overrides). If anchored desktop placement becomes a follow-up requirement, the cleanest path is the new CSS Anchor Positioning module on a feature-detect.
3. **Mobile bottom sheet — no swipe-down dismiss.** The existing `components/ui/sheet.tsx` (Phase 15) implements swipe-down-to-dismiss for the article reader; replicating it inside a `<dialog>` requires either fighting the dialog's `transform` baseline or duplicating the sheet's gesture machinery. PMF scope: backdrop tap + Cancel button + Escape are sufficient close affordances. Swipe-down can be added as a follow-up if user testing shows demand.

**Files:** new `lib/queries/tag-counts.ts`, new `components/feed/filter-popover.tsx`; modified `components/feed/tag-chip-rail.tsx`, `app/(main)/page.tsx`.

**Verification (2026-05-02):** `npm run build` exit 0; `node scripts/check-bundle-budget.mjs` → **`Home=45554B`** (+1027 B vs §0m baseline; well under 85 KiB cap and the §10 acceptance budget of < 4 KiB gzip), **`Detail=40615B`** (unchanged — popover ships only on Home).

**Manual smoke (recommended before merge):**
- Click `More (N)` chip → dialog opens; search input is auto-focused; existing rail-selected tags appear as pre-checked rows.
- Type partial label/slug in search → list filters to matches; "No tags match" shown when empty.
- Toggle a checkbox; Apply enables. Click Cancel → dialog closes, URL `tags` unchanged.
- Toggle a checkbox; click Apply → dialog closes, URL `tags` reflects new selection, feed re-renders.
- Click Clear (footer) with selections → all checkboxes clear; Apply commits empty selection (`tags` removed from URL).
- Press Escape → dialog closes, focus returns to `More (N)` trigger.
- Click backdrop → dialog closes, focus returns to trigger.
- Mobile (`<lg`): dialog renders as bottom sheet; same close affordances; max-height 80vh with internal scroll.
- Reduced-motion: no animation regressions (no transforms applied — opens via dialog default + Tailwind position classes only).
- Keyboard pass: Tab cycles trigger → search → list checkboxes → Clear → Cancel → Apply; native focus trap keeps cycling inside the dialog.

---

### 0o. Phase 12 — infinite scroll diagnostic — deferred 2026-05-02

**Status:** **DEFERRED — no code change today.** Per §5 / §10, Phase 12 is diagnostic-only ("Only if data shows the issue is real (count > 24 in active stream and sentinel still doesn't trigger). No code change unless evidence demands.").

**Why no work today:** No regression report has been filed against `<FeedPager/>` in this batch; no count-> 24 stream is on hand to reproduce. Shipping speculative `console.debug` + ancestor-overflow probes without a failing case adds noise to a healthy code path and risks landing the diagnostic instrumentation forever (production logs gain noise; future PRs have to clean up). Better to keep the phase open, attached to its trigger ("real failure data"), and revisit when an actual report lands.

**What's pre-positioned (no code yet):** if a report lands, the workflow is:
1. Reproduce locally with a stream whose published count exceeds 24.
2. Add a one-shot `console.debug('[feed-pager] io', { intersecting, nextCursor })` inside the `IntersectionObserver` callback in `components/feed/feed-pager.tsx`.
3. Audit `<FeedPager/>` ancestors for `overflow-hidden` / `contain` — the most common silent breakage.
4. Confirm the API returns a non-null `nextCursor` for page 2.
5. Remove the diagnostic before merge.

**Files (when triggered):** `components/feed/feed-pager.tsx` (temporary instrumentation only).

---

### 0p. Phase 14.5 — Cloudinary `image/fetch` proxy — scheduled 2026-05-15

**Status:** **SCHEDULED** — remote routine `trig_01SDqvQfNqxCYY7ySpinPrY6` fires once at **2026-05-15T03:30:00Z** (Friday 09:00 IST), ~2 weeks after Phase 14 Tier 1 shipped (2026-05-01) per §2.J Tier 2 cadence. Manage at https://claude.ai/code/routines/trig_01SDqvQfNqxCYY7ySpinPrY6.

**Why this is a scheduled remote agent rather than a manual pickup:** §2.J Tier 2 was always a "~2 weeks after Tier 1" follow-up — long enough for the Tier 1 `unoptimized={true}` posture to soak in production, short enough to avoid drift. Letting the cadence ride on a one-time routine is more reliable than a calendar reminder, and the work is mechanical enough (URL-template helper + lockstep three-list shrink + smoke verification) for an unattended remote agent given a self-contained brief.

**Pre-flight blockers the operator should resolve before the routine fires:**
1. **GitHub auth** — at scheduling time, claude.ai flagged `GitHub not connected for nuggets-one/nuggets-one`. The remote agent cannot push a branch or open a PR until the operator runs `/web-setup` or installs the Claude GitHub App on the repo. If still missing on 2026-05-15, the agent will fail at `git push` and surface the failure in its run log.
2. **Cloudinary cloud name** — Phase 14.5 requires the Cloudinary cloud name available at URL-construction time (suggested env var `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`). The agent's prompt instructs it to open a **draft PR with a blocker note** if no value is configured, rather than invent one.
3. **Cloudinary `fetch_url_enabled` flag** — must be on for the account. Agent will spot-check and flag in PR description if it cannot verify.

**What the agent will do (full prompt is captured in the routine):**
1. Read `AGENTS.md`, `CLAUDE.md`, plan §2.J Tier 2, plan §0c, and the Phase 14 Tier 1 git history before writing code.
2. Run the pre-flight blocker check.
3. New `lib/ui/cloudinary-fetch.ts` exposing `cloudinaryFetchUrl(externalUrl, opts?)` returning `https://res.cloudinary.com/{cloud}/image/fetch/f_auto,q_auto,w_{opts.width ?? 768}/{encodeURIComponent(externalUrl)}` with graceful fallback when the env var is missing.
4. `components/ui/card-thumbnail-grid.tsx` + `components/ui/card-media.tsx` — wrap non-Cloudinary, non-`i.ytimg.com` URLs through the helper; drop `unoptimized={true}` and `unoptimized={!shouldOptimizeImage(host)}`.
5. `lib/ui/card-image-host.ts` — collapse the host predicate to `res.cloudinary.com` + `i.ytimg.com`. Update the three-list lockstep comment.
6. `next.config.ts` — `images.remotePatterns` shrinks to `res.cloudinary.com` + `i.ytimg.com`. CSP `img-src` mirrors the shrink (drop `pbs.twimg.com`, `i.redd.it`, `preview.redd.it`, `i.imgur.com`, `media.licdn.com`).
7. Verify: `npm run build` + `node scripts/check-bundle-budget.mjs` + `grep -r 'unoptimized' components/ lib/` returns zero hits in card paths.
8. Update plan (status table row 14, new §0p body replacing this scheduling note, §10 build order) + changelog (top bullet, work-execution-log entry, Pending snapshot trim).
9. Open PR `feat(homepage): Phase 14.5 Cloudinary image/fetch proxy` on branch `feat/phase-14-5-cloudinary-fetch`. Draft if any verification step did not pass.

**What this section becomes after the routine runs:** the agent is instructed to **replace this scheduling note with the post-ship body** (outcome, what shipped, files, verification, deviations) when it updates the plan. If the agent leaves a draft PR for blocker reasons, this scheduling note remains and the §0 status table row stays open.

**If the routine fails before the operator notices:** rerun via `https://claude.ai/code/routines/trig_01SDqvQfNqxCYY7ySpinPrY6` ("Run now") after fixing the underlying blocker (GitHub auth / Cloudinary env). The routine is one-shot and auto-disables after the first fire; re-arming requires a `run_once_at` update via the same UI or `RemoteTrigger` API.

---

This plan exists because the user requested a holistic, second/third-order-aware roadmap rather than a piecemeal patch. Implementation proceeds **only after §2 conflicts are resolved**. Phases below are designed to ship independently; each is one PR with a complete vertical (no half-baked features).

---

## 1. Scope

Bring the new Next.js 15 homepage to the agreed v2 chrome. The existing implementation is mostly correct against the **frozen** v2 spec; the user's reference is the **old v1 app**, which v2 explicitly simplified. Several of the user's stated targets reintroduce v1 chrome that PMF froze out.

Out of scope:
- Schema/migration changes
- Re-architecting RSC boundaries
- New deps (forbidden list in `CLAUDE.md`)
- Anything labelled "deferred" in `CLAUDE.md`

---

## 2. Decisions (locked) — designer rationale

Each decision documents the user direction, the constraint reality, and the design choice. Where the user direction conflicted with frozen spec, the resolution is the elite-UX route, not a literal compromise.

### 2.A — Stream tabs (body chrome, magazine-section style)
> ⚠ **Perf re-evaluation note (2026-05-01):** the original §3.3 "no stream switcher in header" rule was justified on click-lag grounds. Under v2 architecture (RSC + nuqs + thin client islands), header placement would *not* re-introduce that lag — see `PERFORMANCE_RULES_REEVALUATION.md` §2.1, §7. The decision below now stands on **editorial / discoverability** reasoning alone. User can revisit if they prefer a nav-rich header.

**Decision:** stream tabs stay in body chrome (per frozen §3.3) but are styled as **magazine-section nav**, the convention used by The New York Times, Bloomberg, FT, Reuters, and Substack.

**Treatment:**
- Sits **directly under the header**, full-width row, subtle 1px bottom border.
- Tabs are text-only when inactive; active tab gets a brand-coloured **2px bottom border** (NYT/Bloomberg pattern), no pill background.
- Typography: `text-sm font-semibold tracking-tight`, generous left/right padding, ~48px row height.
- Container is **not sticky** PMF (matches §3.3 — header scrolls away gives more vertical room).
- Mobile: same component, full-width, scrollable if more streams added later.
- Component remains `'use client'` (already so) — single nuqs write, `useTransition`-wrapped.

**Why this is "best global standard" without overriding the freeze:**
The frozen rule is "stream switcher not in *header chrome*." Editorial sites globally place section nav **immediately below masthead** — not inside it. That visual continuity is what the user actually wants. Painting the tabs as a magazine section bar gives the prominence of header nav without re-introducing v1's click-lag failure mode.

**Files:** `components/feed/stream-tabs.tsx` restyle; `app/(main)/page.tsx` ensures stream tabs are the **first** body element above any intro / chip rail.

### 2.B — Header nav links (HONOR §3.3 — surface destinations elsewhere)
> ⚠ **Perf re-evaluation note (2026-05-01):** the §3.3 "no header nav" rule was originally justified as click-lag prevention. Under v2, a `next/link` in the header costs ≈ 0 client JS; the failure mechanism (FilterStateContext cascade) does not exist in v2. See `PERFORMANCE_RULES_REEVALUATION.md` §2.1, §3, §7. The decision below now stands on **editorial cleanliness + content density + mobile thumb-reachability**.
>
> ✅ **User confirmation (2026-05-01):** locked. User explicitly endorsed the minimalist content-density approach. Rationale: "I prefer minimalistic high core content density focussed website... maximum space for the the nugget cards." This matches NYT / Bloomberg / FT / Reuters / Substack / Medium — all reading-focused properties keep the header to utilities + auth and surface destinations via dropdown + body chrome + (mobile) bottom nav. Every header pixel saved is a card pixel gained above the fold. **Re-visiting closed.**

**Decision:** strip `Home / Collections / Create nugget` from the header. Replace with the elite three-surface pattern used by NYT, FT, WSJ, Twitter:

| Surface | Contents | Visibility |
|---|---|---|
| **Header right cluster** | Theme toggle · Notification bell · Avatar dropdown | Always |
| **Avatar dropdown** | Bookmarks · Collections · Admin (gated) · Sign out | Authenticated; Admin only when `is_admin` |
| **Mobile bottom nav** | Nuggets · Market Pulse · Collections · Bookmarks | `<lg` viewports, fixed bottom |
| **Body chrome (Home only)** | Stream tabs (2.A) · Chip rail · Active filters | Home only |

**Why §3.3 froze this (and the technical re-reading):**
The frozen rationale cited founder-reported click-lag from v1 chrome breadth. The **technical** root cause was different: v1's `FilterStateContext` sat above a fully-hydrated client tree, so any header click cascaded re-renders into the feed grid. v2 eliminated that mechanism (RSC + nuqs). A `next/link` in the v2 header is structurally incapable of triggering the v1 cascade. So the reason to keep the header thin is now **bundle/island discipline + editorial restraint**, not click-lag avoidance — see `PERFORMANCE_RULES_REEVALUATION.md`.

**Why this answers the user's discoverability concern:**
1. **Anonymous users** rarely need cross-app nav — they're discovering content on Home; Collections is one click away in the avatar/bottom-nav surfaces.
2. **Authenticated readers** keep nav close at hand via avatar dropdown (NYT, Medium, Substack pattern).
3. **Mobile users** get a thumb-reachable bottom nav (Twitter, Instagram, NYT app pattern) — far better than a cramped header.
4. **Admins** see the Admin link only after auth — never leaks into anonymous chrome.

**Files:** `components/layout/header.tsx`, `components/layout/header-auth-island.tsx`, `app/api/auth/status/route.ts` (return `isAdmin`), new `components/layout/mobile-bottom-nav.tsx`.

### 2.C — Grid columns: 4 at xl (override §3.4 with explicit user direction)
**Decision:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` at `max-w-[1800px]`. This matches **YouTube without sidebar**, the user's reference, and the replication spec §6.

**Why this overrides `PRODUCT` §3.4 (1/2/3):**
The user's audience hypothesis ("busy folks scanning lots of content quickly") is a reader-density argument, and it's correct for this product class. Industry density at xl:
- YouTube (no sidebar): 4
- NYT homepage: 4 cards in top stories
- Bloomberg: 4–5
- Reuters: 4
- Replication spec: 4

3 cols at xl reads as a long-form magazine (Medium, Stratechery). 4 cols at xl reads as a scan-first reader (YouTube, news). This product is the latter.

**LCP / perf reality:**
- At 4 cols on `max-w-[1800px]`: each card ≈ 432px wide → first hero ≈ 432×243. Cloudinary `f_auto, q_auto` typical bytes < 35 KB.
- At 3 cols: each card ≈ 576px → first hero ≈ 576×324, bytes ≈ 55 KB.
- **4 cols actually yields a slightly faster LCP** (smaller hero bytes) and shows 33% more cards above the fold. There is no perf reason to hold 3 cols.

**Recorded override:** `PRODUCT` §3.4 should be amended to "1 / 2 / 3 / 4 at base / md / lg / xl" once the user signs off in writing. Until then this plan is the operative source for grid breakpoints.

**Files:** `app/(main)/page.tsx`, `components/feed/feed-pager.tsx`, `components/feed/feed-skeleton.tsx`.

### 2.D — Filter popover ("More" chip on rail, flat list, dimension hidden)
**Decision:** match `PRODUCT` §11.1 exactly. **There is no separate "Filters" button.** Instead, the **last visible chip on the rail** is `More (N)` — clicking opens a popover (desktop) or bottom sheet (mobile) containing the **flat** list of all official tags.

**Why "where is the popover?" — clarification:**
The popover *doesn't exist yet* in the codebase. Today's `tag-chip-rail.tsx` collapses to 12 with a "Show more" expand-in-place button — that's wrong both visually (it pushes content) and per §11.1. The fix is:
1. Rail shows as many chips as fit in one horizontal scroll lane.
2. End-of-rail `More (N)` chip → on click → popover (`<details>` + `<dialog>` for desktop) or bottom sheet (`<dialog>` with bottom-anchor styles for mobile).
3. Popover contents: search-within-tags input + flat checkbox list + Apply + Clear.
4. No expand-in-place; no second row of chips.

**Why flat (no dimension grouping):**
`PRODUCT` §11.1 froze this because: (a) curated `is_official` tag set yields ~12–30 chips total — too small to justify grouping; (b) dimension grouping demands 3 sub-headers + 3 collapsible sections, recreating the v1 sidebar-in-a-popover pattern that v2 killed; (c) flat list scans faster (one Fitts-distance per click instead of one to expand a section + one to pick).

**Better add for elite UX:** include the per-tag count next to each label (`Macro · 14`) so users sense filter strength before clicking. Counts come from a single SQL query joining `articles.tag_slugs` GIN index — `select unnest(tag_slugs), count(*) ... group by 1` — cached daily.

**Files:** new `components/feed/filter-popover.tsx`; modify `components/feed/tag-chip-rail.tsx` to drop expand-in-place and add the `More (N)` chip; new `lib/queries/tag-counts.ts` (cached).

### 2.E — Three-dot card menu — DROP (replace with named icon row)
**Decision:** no `…` menu on cards. Card footer has **3 explicit icon actions**: Bookmark · Share · Source (badge on media). Detail page adds View source CTA + (admin) Edit.

**Why "isn't `…` standard?" — design principle:**
Yes, the `…` overflow is a global pattern, but its purpose is to **hide secondary actions when there are too many to surface**. Today there are exactly two candidates for the menu — both blocked:
- **Add to collection** — `CLAUDE.md` forbidden: *"BookmarkCollection / CollectionSelector → flat /bookmarks only."* v2 explicitly removed the "save to collection" friction. Adding it back as a disabled stub teaches users a feature that doesn't exist.
- **Report** — not in PMF scope per `CLAUDE.md` deferred list. A disabled "Report" item would be the only thing in the menu.

A `…` button hiding two greyed-out items is anti-pattern: it tells the user "click here" then blocks the click. **Empty menus are noise.** Drop until a real second-tier action exists.

If `Report` ships post-PMF, we add `…` then. The icon row pattern (Bookmark · Share) is the **YouTube card pattern, the Twitter post pattern, the Substack post pattern** — three icons inline, no overflow. We're in good company.

**Files:** `components/ui/article-card.tsx` (no menu added; icon row only).

### 2.F — Card admin Edit/Delete — DROP card surfacing; admin actions on detail + admin index
**Decision:** no admin actions on Home cards. `/admin/articles` index page surfaces Edit/Delete inline (admin-only route). Detail page (`/nuggets/[id]/[slug]`) gains a discreet `Edit` pencil top-right, gated by `is_admin`.

**Reasoning (to your "what was the reason"):**
1. **One canonical surface per action** (`PRODUCT` §1b / §2). Admin already has a full `/admin/articles/[id]` page with form, server actions, and audit trail. Splitting "edit" between the public card and the admin route forces every admin to remember two flows.
2. **Server boundary cleanliness.** Showing admin buttons on a Home card means the public card needs to know `is_admin` for every render. Today's `ArticleCard` is a clean Server Component reading article props only. Adding admin-gate logic per card forces an `await getUser()` per render or an ugly client island just for the button. Both options regress the v2 "thin chrome" performance baseline.
3. **Editorial reading surface should look the same for everyone.** Hover-revealed admin chrome on a public card is a low-discoverability win for admins (you can miss it) and a visual leak for power-users on shared screens.
4. **The admin index already works.** `/admin/articles` is a dedicated admin surface. Bulk Edit/Delete belongs there. Per-article Edit belongs on the article itself.

**Best-of-both surfacing:**
- Admin on detail page: small `Edit` pencil top-right, only when `is_admin`. One click → `/admin/articles/[id]`.
- Admin index: a quick-edit row at `/admin/articles` (already partially built per build-execution PR-04).
- Cards stay clean, fast, and identical for all users.

**Files:** `app/(main)/nuggets/[id]/[slug]/page.tsx` adds the admin Edit affordance; `components/ui/article-card.tsx` unchanged for admin.

### 2.G — Card share — INCLUDE on both card and detail (per user direction)
**Decision:** `<ShareButton/>` is a single `'use client'` island used in:
- **Detail page:** primary, in the footer action row beside Bookmark.
- **Card footer:** secondary, between View Full Article link and Bookmark icon.

**Behavior (one consistent flow on both surfaces):**
1. On click, `if (navigator.share)` → native sheet (mobile + supporting desktops) with `{title, url}`.
2. Else → `navigator.clipboard.writeText(url)` + a 1.5s "Copied" toast inline beside the button (no portal).
3. Telemetry fire-and-forget: `share_initiated { surface: 'card'|'detail', channel: 'native'|'copy' }` per `PRODUCT` §9.

**Why this departs from `PRODUCT` §9 ("omit on card if it clutters"):**
The card density at 4 cols is high enough that adding one icon doesn't tip clutter. Visible card share is a **growth mechanic** — every visible share button is a chance to spread the product. In a PMF launch context that asymmetry favors inclusion. The §9 escape hatch ("acceptable PMF to omit") is permission to drop, not a directive.

**Files:** new `components/ui/share-button.tsx`; mounted in `components/ui/article-card.tsx` and `app/(main)/nuggets/[id]/[slug]/page.tsx`.

### 2.H — `/admin/articles/new` "Create nugget" surfacing
**Decision:** drop from header. Move into the avatar dropdown under "Admin" submenu when `is_admin` is true. Reachable from `/admin` index regardless. Required regardless of 2.B because today's link is exposed to anonymous users — a cosmetic boundary leak.

### 2.I — Card-excerpt markdown rendering (JIT in RSC + cache + sanitize) — AMENDED 2026-05-01
> **Overrides** the implicit Phase 1 / `CLAUDE.md` rule "No react-markdown in card components" to the extent that **rendering** is concerned. The `react-markdown` *library* still does not ship to clients on the card path. Markdown→HTML happens server-side only.

**Decision:** card excerpts render markdown as HTML, generated **just-in-time inside the Server Component**, cached per-article via `unstable_cache` keyed on `article.id + updated_at`, sanitized with `rehype-sanitize`. No `excerpt_html` column. No client JS for the card body.

**Why this beats the two alternatives evaluated:**
- **HTML-in-DB column (rejected):** mixes derived data with authoritative truth; CSS or AST changes force a row migration; admin Server Action edit path and ingest pipeline drift apart.
- **Ingest-time DB-trigger generation (rejected):** Postgres-side `rehype-sanitize` is awkward; admin Server Action vs trigger create two render paths with subtle skew; over-engineered at PMF scale.
- **JIT + `unstable_cache` (chosen):** DB stays pure markdown. Cache key naturally invalidates on edit. CSS-only changes don't trigger re-render. TTFB is amortized across requests. Zero client JS on the card path.

**Implementation contract:**
- `lib/ui/excerpt-markdown.ts` — pure async fn `renderExcerptMarkdown(markdown: string): Promise<string>`. Uses `unified` + `remark-parse` + `remark-gfm` + `remark-rehype` + `rehype-sanitize` + `rehype-stringify`. Returns sanitized HTML string.
- Wrap in `unstable_cache` with key `['excerpt-html', article.id, article.updated_at]` and `revalidate: 86400`. Keyed by `updated_at` so edits invalidate naturally without manual revalidation.
- `ArticleCard` (Server Component) calls `await renderExcerptMarkdown(article.excerpt)` and renders via `<div dangerouslySetInnerHTML={{ __html }}>`. Wrap in a `prose-sm prose-zinc dark:prose-invert max-w-none` container scoped to the card (no `prose-img` — images don't render in excerpts; image markdown is stripped by sanitize allowlist).
- Sanitize allowlist: `p, em, strong, code, a, ul, ol, li, blockquote, br`. Drop `img`, `iframe`, `script`, `style`, headings (h1–h6), tables. The excerpt is short-form context — no heavy structures.
- Extend `lib/ui/excerpt-card.ts` `formatExcerptForCard` to operate on the **sanitized HTML string** (truncate at ~280 chars including tags or strip-then-truncate; pick whichever preserves valid HTML). Or: keep `formatExcerptForCard` for the plain-text fallback path and add a parallel `formatExcerptHtmlForCard` that truncates at the closing tag boundary.
- Bundle delta on Home: 0 KB client (server-only). Bundle delta on server fn: ~30 KB unified pipeline, but loaded once per cold start, not per request.

**What this preserves of the original ban:**
- No `react-markdown` in client code.
- No client-side markdown processing.
- Card stays a pure Server Component.

**Files:** new `lib/ui/excerpt-markdown.ts`; modify `components/ui/article-card.tsx`; package add `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-sanitize`, `rehype-stringify` (all already transitive deps via `react-markdown`/`remark-gfm` already installed for `<ArticleBody/>` — no new install if already present).

**Rollback:** revert Phase 13 PR. Card excerpt falls back to plain-text via existing `formatExcerptForCard`.

### 2.J — Card multi-image rendering (article_media plumb + tiered delivery) — AMENDED 2026-05-01
> **Extends** Phase 2 (YouTube hero fallback) to general multi-image card rendering. Schema already supports it (`article_media` table since the initial migration); only the query and render path need plumbing.

**Decision:** `getFeedPage()` returns up to 4 image rows from `article_media` per article, sorted by `sort_order`. `<ArticleCard/>` renders single-image (current `<Image>` aspect-video) or multi-image (2/3/4-up `<CardThumbnailGrid/>`) per the count. Image delivery is **two-tiered**:

**Tier 1 (now, Phase 14):** `unoptimized={true}` on `<Image>` for any host outside `res.cloudinary.com` and `i.ytimg.com`. Vercel image optimizer is bypassed; layout stability of `<Image>` is preserved (lazy load, fill, sizes, intrinsic). `remotePatterns` adds the volume hosts: `pbs.twimg.com`, `i.redd.it`, `preview.redd.it`, `i.imgur.com`, `media.licdn.com`. Mobile penalty: full-source-weight tweets/Reddit images (~150–400 KB vs 50–80 KB optimized). Acceptable for PMF; Hobby quota preserved.

**Tier 2 (~2 weeks out, Phase 14.5 / separate ticket):** wrap external image URLs in Cloudinary's `image/fetch` URL pattern: `https://res.cloudinary.com/{cloud}/image/fetch/f_auto,q_auto,w_768/{url-encoded source}`. Cloudinary becomes the unified proxy — smart crop, format conversion, CDN. `remotePatterns` shrinks back to a single entry (`res.cloudinary.com`). Drop `unoptimized`. No new infra; just URL construction.

**Image classification:** port `isImageUrl()` from `docs/CARD_MEDIA_IMAGE_URL_PATTERNS.md` into `lib/ui/is-image-url.ts`. Recognize: direct extension (jpg/jpeg/png/gif/webp/svg/svgz), Cloudflare `/cdn-cgi/imagedelivery/`, Twitter `pbs.twimg.com/media/`, Reddit `i.redd.it`/`preview.redd.it`, Imgur `i.imgur.com`, LinkedIn `media.licdn.com/.../image/`, Cloudfront `_images`/`/images/`/`/image/`, generic `cdn.`/`img.`/`image.`/`thumbs.` with format/query hints.

**Card thumbnail grid layouts** (per replication spec §8):
- 1 image: full `aspect-video`, `object-cover` for YouTube / `object-contain` for uploaded (preserve no-crop rule).
- 2 images: 50/50 split.
- 3 images: 1 large left + 2 stacked right.
- 4+ images: 2x2 with `+N` overlay on the 4th cell.

**Files:** new `lib/ui/is-image-url.ts`; new `components/ui/card-thumbnail-grid.tsx`; modify `lib/queries/feed.ts` (return `article_media` array per article); modify `components/ui/article-card.tsx` (route to single vs grid); modify `next.config.ts` (`remotePatterns` additions). Phase 14.5 modifies the URL construction only.

**Rollback:** revert Phase 14 PR. Card returns to single `hero_thumb_url` rendering.

### 2.K — Detail reading pattern: canonical nugget route + intercepted sheet shell — AMENDED 2026-05-01
> **Overrides** §7 ("Modal/drawer reading pattern — frozen out") and **scoped lift** of `CLAUDE.md` rule "ArticleModal / ArticleDrawer → use /nuggets/[id]/[slug]". The lift is **narrow**: only the parallel-slot + intercepting-route pattern is permitted. Context-driven modals (e.g. a `useModalState` hook above the grid) remain banned because that's the v1 pattern that caused click-lag. The intercepting-route pattern is a *route*, not a context — it does not re-introduce the v1 failure mechanism.

**Decision:** clicking a card from the feed opens the canonical nugget route in an in-context **sheet** rendered via Next 15 parallel slot + intercepting route. The grid stays mounted underneath; scroll position is preserved; URL updates to `/nuggets/[id]/[slug]`. Direct hits to that URL serve the canonical full page (mobile fallback, deep-link share targets). The route stays singular; only the shell changes by entry context.

**Why this overrides §7 (which said "modal reading pattern — frozen out"):**
The v1 freeze was perf-grounded — the original modal sat above a context-cascaded grid. Under v2, the sheet is a *route* parallel-slotted into the layout. Background grid does not re-render on open. `PERFORMANCE_RULES_REEVALUATION.md` §7 confirmed v2's architecture structurally eliminates the v1 cascade. Bundle cost: ~3–5 KB gzip for sheet shell. Home is at 42.6 KB / 85 KB — comfortable headroom.

**User-stated requirement (2026-05-01):** "Users are busy folks. Any way possible, they can see the entire article without being driven away from the grid… Too many clicks to read and come back spoils the user experience." Hard navigation is the failure mode being solved.

**Implementation contract:**
- `app/(main)/layout.tsx` — accept `modal` slot prop alongside `children`. Render `{children}{modal}`.
- `app/(main)/@modal/default.tsx` — returns `null`. **Required.** Without it, the slot leaks into direct URLs.
- `app/(main)/@modal/(.)nuggets/[id]/[slug]/page.tsx` — intercepts feed-originated nav. Renders the canonical nugget route inside `<Sheet>` using the same `<ArticleContent>` as the full-page shell.
- `components/ui/sheet.tsx` (`'use client'`) — focus trap, escape-to-close, backdrop-click-to-close, swipe-down-to-close on mobile. Single client island. ~3–5 KB gzip.
  - Desktop: side panel anchored right, ~640px wide, full height, slide-in from right.
  - Mobile (`<lg`): bottom sheet, ~92vh, slide-up from bottom.
  - Reduced-motion: snap, no slide.
- Close → `router.back()`. URL returns to feed; `searchParams` (filters) preserved automatically because `router.back()` traverses history.
- `components/ui/article-card.tsx` — `<Link>` href stays `/nuggets/[id]/[slug]` (unchanged). Next 15 routes feed-originated clicks through the intercept; direct URL paste/share-link goes to the full-page shell of that same canonical route. **No card-level routing change.**

**Risks acknowledged:**
- Parallel-slot + intercepting-route in Next 15 has known sharp edges around `default.tsx` discipline and prefetch. Phase 15 PR includes a smoke test of: feed → click card → sheet opens → close → grid scroll preserved → click another → second sheet opens → back button closes → forward reopens → direct URL paste shows full page (no sheet) → share link from sheet copies canonical URL.
- Body markdown render (`react-markdown` + `remark-gfm`, ~30–40 KB) loads on first sheet open. Same total cost as today's first detail nav — net zero. Subsequent opens are cache-warm.
- Filter changes from chip rail while sheet is open: grid behind re-fetches via RSC (parallel slots share the layout). Sheet stays open during the re-fetch — verify.

**Files:** modify `app/(main)/layout.tsx` (slot prop); new `app/(main)/@modal/default.tsx`; new `app/(main)/@modal/(.)nuggets/[id]/[slug]/page.tsx`; extract `components/ui/article-content.tsx` from current `app/(main)/nuggets/[id]/[slug]/page.tsx`; new `components/ui/sheet.tsx`; modify canonical route to consume the extracted `<ArticleContent/>`.

**Out of scope for Phase 15 (still frozen):**
- Context-driven modals (e.g. `<ModalProvider>` above the grid).
- "Add to collection" modal — `CLAUDE.md` ban remains in force.
- Admin CRUD modals — `CLAUDE.md` ban remains in force.

The lift is **route-pattern-specific**. All other modal bans hold.

**Rollback:** revert Phase 15 PR. `@modal` slot returns `null`; intercepting route is removed; canonical route unchanged. Cards hard-nav as today.

### 2.L — Card body typography: `text-sm` + tight metrics — AMENDED 2026-05-01
> **Overrides** the replication spec §6 typography table (`text-xs` for title and body) for the **body** specifically. Title can stay at current `text-base` (replication spec said `text-xs`; current is more readable at 4-col density and not a regression). Tag pills, footer meta, and source pill (Phase 7) keep `text-xs` / `text-[10px]` per spec.

**Decision:**
- **Body / excerpt:** `text-sm leading-snug tracking-tight` (was `text-sm leading-relaxed`). Drop relaxed leading; add tight tracking. Density without sacrificing 14px legibility.
- **Title:** `text-base font-semibold leading-snug line-clamp-2` (current). Keep.
- **Tag pills:** `text-xs font-medium px-1.5 py-0.5 border bg-surface-raised rounded-full` (per spec — tighten current `px-2`).
- **Footer meta (date):** `text-xs text-muted` (current).
- **Source pill (Phase 7):** `text-[10px]` on dark translucent overlay (per spec).
- **CTA "View Full Article":** convert from inline text link to quiet `rounded-full text-xs font-medium px-3 py-1 hover:bg-surface-raised text-muted hover:text-primary` pill. Quieter visual, same min-tap-44 target.

**Why this overrides the spec literally:**
The replication spec was written for v1's narrower masonry-column card (~280–340px wide). Plan §2.C locked v2 cards at 4 cols on `max-w-[1800px]` → ~432px wide. At that width, 12px body (`text-xs`) is cramped; 14px (`text-sm`) is the readable density. The spec's *intent* (restraint, density, no swelling typography) is preserved; the literal value is adjusted for the wider card.

**Componentization (Sugg 2 of the user's evaluation):** During the same PR, decompose `components/ui/article-card.tsx` (currently 219 lines, mixed concerns) into:
- `components/ui/article-card.tsx` — orchestrator, ~60 lines.
- `components/ui/card-media.tsx` — single-image / YouTube overlay / source pill (Phase 7 lands here).
- `components/ui/card-body.tsx` — tags + title + excerpt (renders sanitized HTML from §2.I when Phase 13 lands).
- `components/ui/card-footer.tsx` — CTA pill + date + bookmark + share (Phase 8 lands here).

Server Components throughout. No client islands added by this phase. Bundle delta: 0 KB.

**Files:** modify `components/ui/article-card.tsx`; new `components/ui/card-media.tsx`, `card-body.tsx`, `card-footer.tsx`.

**Rollback:** revert Phase 16 PR. Single-file `ArticleCard` returns.

---

## 3. Items missed in the initial audit (cross-checked against the four main docs)

These were not in the original L/S/C/SR/AV/F scheme.

### M1 — Site footer (every page)
- **Spec:** `PRODUCT` §3.3 — disclaimer + legal links (Terms · Privacy · Contact from `legal_pages`) + brand line. Server Component, no client JS. Mounts on every route. Replication spec §8 confirms placement and density.
- **Shipped 2026-05-02 (Phase 5 / §0i):** `components/layout/footer.tsx` (async Server Component, `Suspense` in layout); `lib/queries/legal-pages.ts` (`listLegalFooterLinks`); migration `20240001000008_legal_pages.sql` (RLS + seed rows); `/legal/contact` placeholder alongside terms/privacy.
- **PMF requirement:** required.

### M2 — Mobile bottom nav
- **Spec:** `PRODUCT` §3.3 / §14 — 4 destinations (Nuggets · Market Pulse · Collections · Bookmarks). Replication spec §7 same. Fixed bottom, safe-area inset, hidden at **`lg`** and up.
- **Shipped:** `components/layout/mobile-bottom-nav.tsx` (**Phase 4 / §0h**) — `usePathname` + **`stream`** on `/`; **`lg:hidden`**.

### M3 — Active filters bar
- **Spec:** `PRODUCT` §11.1 — between chip rail and grid; renders when `tags` or `q` set; removable pills + right-aligned **Clear all**.
- **State today:** there's a result-summary line on the home feed but no removable filter chips outside the rail and no Clear all.
- **Risk:** small but visible regression vs spec.

### M4 — YouTube state machine + body timestamp deep-link
- **Spec:** `BLUEPRINT` §6.3a + `PRODUCT` §0.14 — frozen 3-state: **Poster** (default first paint) → **Embed loaded** (only after user clicks "Load video" or any body timestamp link) → **Outbound** ("Watch on YouTube" `target="_blank"`). **Never autoplay. Never embed on Home cards.** Body markdown contains `[label](#yt=154)` fragment links; clicking seeks the player via `postMessage` `seekTo`.
- **State today:** detail page renders `<Image>` only (no embed, no poster overlay, no timestamp handler).
- **My initial C4 (just an iframe) is incomplete.** This is a single client island that owns the state machine, intercepts hash clicks, scrolls embed into view, and seeks. Re-scoped under Phase 6 below.

### M5 — Detail page Share button
- **Spec:** `PRODUCT` §9 — Share is **primary** on detail (header toolbar). `navigator.share` preferred when available; copy-link fallback with toast. Telemetry: `share_initiated { surface, channel }`.
- **State today:** detail page has Bookmark + "View source" only. No share.
- **PMF requirement:** required.

### M6 — Header alignment with §3.3 (cleanup)
- **Resolved 2026-05-02** — inline **`Home` / `Collections` / `Create nugget`** chrome removed (**Phase 3 / §0g**); auth island extended per §2.B. Mobile bottom nav waits on **Phase 4**.

### M7 — Anonymous PublicHomeIntro / ValueStrip / PulseIntroBanner
- **Source:** Replication spec §3-4 only (v1 onboarding strip). **Not** in `PRODUCT` or `BLUEPRINT` as a PMF requirement.
- **My recommendation:** defer. Adds homepage code surface for an onboarding strip that v2 didn't freeze in. Revisit post-PMF.

### M8 — Suggest endpoint result cap
- **Spec:** `PRODUCT` §11 — cap 8 rows. **Verified 2026-05-02** — `SEARCH_SUGGEST_ROW_CAP` + `.limit(Math.min(...))` in **`suggestArticles`**; details **§0e**.

### M9 — `/admin/articles/new` link admin-gate
- See §2.G.

### M10 — `/account` route stub
- User said drop the menu link (AV1 answer). Spec §0.13 keeps the route minimal-PMF. Removing the menu item is fine; route can remain hidden.

---

## 4. Constraint compliance — final mapping

| Item | Verdict | Resolution |
|---|---|---|
| L1 grid | Override of §3.4 with documented rationale | 1/2/3/4 at base/md/lg/xl per §2.C |
| L2 max-w | Spec-aligned | `max-w-[1800px]` |
| L3 chip rail | Spec-aligned (§11.1) | Single-row scroll, fade gradients, **drop expand-in-place**, end-of-rail `More (N)` chip → popover |
| L4 header nav | Spec-aligned (§3.3 honored) | Strip header nav per §2.B; magazine-section stream tabs in body chrome per §2.A |
| S1 IO | Spec-aligned (BLUEPRINT §6.3) | No change unless data shows real failure |
| C1 hero fallback | Spec-aligned | YouTube `i.ytimg.com` URL fallback when `hero_thumb_url` null |
| C2 strip markdown | Spec-aligned | Pure function, no deps |
| C3 tag filter / +N | Defensive | Drop stream-like values; +N overflow chip |
| C4 YouTube | Re-scoped to §6.3a state machine | Phase 6 |
| C5.2 source badge | Spec-aligned (replication §A6) | Top-right of media |
| C5.3 share on card | Included by user direction | Phase 8, both surfaces use same `<ShareButton/>` |
| C5.4 three-dot menu | Dropped | §2.E |
| C5.5 admin on cards | Dropped; moved to detail + /admin index | §2.F |
| C6 date in footer | Layout move | Pure layout |
| SR1 search | Spec-aligned (180ms / ≥2 / 8) | Verify cap is enforced |
| AV1 admin link | Spec-aligned | `/api/auth/status` returns `isAdmin`; dropdown shows Admin |
| F1 filter popover | Spec-aligned (§11.1, flat) | End-of-rail trigger; flat list with counts |

---

## 5. Phased plan (each phase = one PR)

Each phase is one shippable PR. Order is dependency-driven; perf and visible-impact-first.

### Phase 1 — P0 visual fixes (CSS + pure-function)
**Scope:**
- L2 — `max-w-[1800px]` in `app/(main)/layout.tsx`.
- L1 — grid breakpoints: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4` everywhere the grid is declared (page, pager, skeleton).
- L3 — tag rail: drop collapse + Show-more, single horizontal scroll, hide native scrollbar, left/right edge fade pseudo-elements (only show when overflow). End-of-rail `More (N)` chip is a placeholder button (no popover wired yet — that's **Phase 10**).
- C2 — `stripMarkdown` rewrite per spec (links, bold, italic, `[[ts]]`, line markers, newlines) in `lib/ui/excerpt-card.ts` + 120-char ellipsis truncation in `article-card.tsx`.
- C6 — move date from top meta row to footer meta row on card.
- C3 — defensive tag filter (`!== 'nuggets' && !== 'pulse'`) + `+N` overflow chip.

**Files:** `app/(main)/layout.tsx`, `components/feed/tag-chip-rail.tsx`, `lib/ui/excerpt-card.ts`, `components/ui/article-card.tsx`, `components/feed/feed-pager.tsx`, `components/feed/feed-skeleton.tsx`, `app/(main)/page.tsx`.

**Acceptance:**
- 4 cols at xl ≥1280px, 3 at lg, 2 at md, 1 below.
- Content area uses up to 1800px before centering.
- Tag rail does not wrap; scrolls horizontally; scrollbar hidden; left/right gradients visible only when overflow.
- Card excerpt contains no `**`, `*`, `[[…]]`, link syntax, or stray newlines; ≤ 120 chars + ellipsis.
- Card date renders in footer meta row (right-aligned), formatted `Apr 30, 2026`.
- Stream-leak tags filtered out; +N pill renders when ≥3 tags.
- `npm run build` exits 0; bundle budget unchanged.

**Risk:** LOW — pure CSS / pure functions.

**Rollback:** revert single PR.

---

### Phase 2 — Hero image fallback (C1) ✅ **COMPLETE 2026-05-02** — **§0f**
**Scope:** YouTube fallback URL construction in `ArticleCard`. Out of scope: backfill of legacy non-Cloudinary `hero_thumb_url` rows (separate ops task — list in `docs/CARD_MEDIA_IMAGE_URL_PATTERNS.md` informs the backfill plan).

**Files:** `components/ui/article-card.tsx`, `lib/ui/excerpt-card.ts` (`youTubePosterHqUrl`).

**Acceptance:**
- Articles with `hero_media_kind='youtube'` and `hero_video_id` set render `https://i.ytimg.com/vi/{video_id}/hqdefault.jpg` even when `hero_thumb_url` is null.
- Other articles unchanged. Gradient placeholder still renders for unknown hosts.

**Risk:** LOW.

**Follow-up:** open a separate ticket for legacy hero URL backfill — extract a list of `articles.hero_thumb_url` hosts where host ∉ {`res.cloudinary.com`, `i.ytimg.com`}, decide per-host whether to transcode to Cloudinary or leave gradient.

---

### Phase 3 — Header alignment with §3.3 (strip nav, extend auth island) ✅ **COMPLETE 2026-05-02** — **§0g**
**Scope:**
- Strip header nav links (`Home`, `Collections`, `Create nugget`) per §2.B.
- Header reduces to: Logomark + wordmark (left) · `<HeaderSearch/>` (center) · Theme toggle · `<HeaderAuthIsland/>` (right cluster).
- `/api/auth/status` extended to return `isAdmin: user?.app_metadata?.is_admin === true`.
- `<HeaderAuthIsland/>` dropdown gains:
  - `Bookmarks` link (auth-only — already present).
  - `Collections` link (always shown to authenticated users).
  - `Admin` submenu / link (only when `isAdmin`) → `/admin/articles`.
  - `Create nugget` (only when `isAdmin`) → `/admin/articles/new`.
  - `Sign out` (existing).
  - Drop the `/account` menu item per user direction.
- Anonymous users keep the existing `Sign in` link (no dropdown to expose).

**Files:** `components/layout/header.tsx`, `components/layout/header-auth-island.tsx`, `app/api/auth/status/route.ts`.

**Acceptance:**
- Anonymous header shows: logomark · wordmark · search · theme · Sign in.
- Authenticated non-admin header dropdown shows: Bookmarks · Collections · Sign out (no Admin, no Create).
- Admin header dropdown additionally shows: Admin · Create nugget.
- No `/account` link.

**Risk:** LOW — confined to header surfaces.

---

### Phase 4 — Magazine-style stream tabs + mobile bottom nav (2.A + M2) ✅ **COMPLETE 2026-05-02** — **§0h**

**Scope (split into two tightly-coupled deliverables but one PR):**

**(a) StreamTabs restyle — magazine-section nav**
- `components/feed/stream-tabs.tsx` restyled per §2.A treatment.
- Container: full-width row directly under header, ~48px height, subtle 1px bottom border (`border-b border-border`), no background fill.
- Tabs: text-only inactive (`text-muted text-sm font-semibold`), active = `text-primary` + 2px accent bottom border (`border-b-2 border-accent -mb-px`), generous left padding so it aligns with `<main>` content gutter.
- Mobile: same pattern, full-width edge-to-edge.
- Behavior unchanged — `useTransition` + nuqs write, clears `tags`+`q` on stream switch (already done).
- Promote out of `<FeedGrid>`'s opening flex container in `app/(main)/page.tsx` so it sits **above** the intro line and chip rail, not inline with them.

**(b) MobileBottomNav (new) — `<lg` only**
- 4 destinations per §14: Nuggets (`/?stream=standard`) · Market Pulse (`/?stream=pulse`) · Collections (`/collections`) · Bookmarks (`/bookmarks`).
- For anonymous users, Bookmarks tab is rendered but routes to `/login?next=/bookmarks` (existing pattern).
- Hidden at `lg+` (`hidden lg:hidden` is no-op; use `lg:hidden`).
- Fixed bottom, `pb-[env(safe-area-inset-bottom)]`, `border-t border-border bg-bg/95 backdrop-blur-sm`.
- Tap target ≥44px per CLAUDE.md.
- Active state: `useSelectedLayoutSegment` for `/collections`, `/bookmarks`; `useSearchParams` for stream on `/`.
- Single client island (uses Next routing hooks).
- Mounted in `app/(main)/layout.tsx`. Pages get `pb-20 lg:pb-0` on `<main>` so content doesn't sit under the bar on mobile.

**Files:** `components/feed/stream-tabs.tsx`, `app/(main)/page.tsx`, new `components/layout/mobile-bottom-nav.tsx`, `app/(main)/layout.tsx`.

**Acceptance:**
- Stream tabs render as a section bar directly below header on home; magazine treatment confirmed at all viewports.
- Mobile bottom nav visible at `<1024px`, hidden at `≥1024px`.
- Active tab indicator on bottom nav matches the surface the user is on (e.g. `/collections` highlights Collections; `/?stream=pulse` highlights Market Pulse).
- Bottom nav doesn't overlap last card row on mobile (footer padding correct).
- Bundle budget unchanged or +1 KiB max.

**Risk:** LOW–MEDIUM — two new client islands, but each is small and uses only routing hooks.

---

### Phase 5 — Footer (M1) ✅ **COMPLETE 2026-05-02** — **§0i**
- Async Server Component, mounts in `app/(main)/layout.tsx` after `<main>` (inside **`Suspense`**).
- Pulls footer links from **`legal_pages`** — single select (`sort_order` ascending); fallback labels if unavailable.
- Disclaimer line + legal nav + © brand line (`PRODUCT` §3.3).

**Files:** `supabase/migrations/20240001000008_legal_pages.sql`, `components/layout/footer.tsx`, `lib/queries/legal-pages.ts`, `app/(main)/layout.tsx`, `app/(main)/legal/contact/page.tsx`, `lib/supabase/types.ts`.

**Acceptance:** renders on every `(main)` route; no new client bundles for the footer shell.

**Risk:** LOW — **COMPLETE**.

---

### Phase 6 — YouTube state machine on detail page (M4 / C4) ✅ **COMPLETE 2026-05-02** — **§0l**
*This is the largest single phase. Treat as one PR but worth its own design pass.*

- New `components/ui/youtube-player.tsx` (`'use client'`) implementing the §6.3a state machine.
  - Props: `videoId`, `posterUrl`, `title`.
  - States: `poster` | `embed` | `outbound`.
  - Renders: poster image with ▶ overlay + Watch-on-YouTube outbound fallback (Poster state) → on click, mounts `<iframe src="https://www.youtube-nocookie.com/embed/{id}?enablejsapi=1">` (Embed state).
  - Exposes a `seekTo(seconds)` method via custom event (`window.dispatchEvent`) so body timestamp links can call it.
- New `components/ui/article-body.tsx` enhancement: intercept clicks on `<a href="#yt=…">`, parse seconds, dispatch the seek event, scroll embed into view. `rehype` plugin or manual onClick — manual is lighter.
- `app/(main)/nuggets/[id]/[slug]/page.tsx` — when `hero_media_kind === 'youtube' && hero_video_id`, render `<YouTubePlayer/>` instead of `<Image>`.
- CSP: `frame-src https://www.youtube.com https://www.youtube-nocookie.com` already present.
- No autoplay. No card embed. Lazy iframe.

**Files:** new `components/ui/youtube-player.tsx`; modify `components/ui/article-body.tsx`; modify `app/(main)/nuggets/[id]/[slug]/page.tsx`.

**Acceptance:**
- Hero renders poster + ▶ on first paint; iframe is **not** in the DOM until click.
- Clicking poster mounts iframe and starts playback (manual play, not autoplay).
- Clicking a `[label](#yt=N)` link in the body mounts the iframe (if not already), seeks to N seconds, scrolls embed into view.
- Watch-on-YouTube outbound link present at all times.
- LCP element on detail page = poster image (not iframe).

**Risk:** MEDIUM — state machine + body click interception + postMessage. Test on at least 3 sample articles (one with timestamps, one without, one without hero set).

**Follow-up:** telemetry event `youtube_play { video_id, seconds, source }` per §6.3a.

---

### Phase 7 — Card source badge (C5.2) ✅ **COMPLETE 2026-05-02** — **§0j**
- Top-right overlay on media block when `source_url` exists.
- Replaces the current footer `Source: host ↗` pattern — dual surfaces are noise.
- Visual: `absolute top-2 right-2`, dark translucent pill (`bg-black/60 backdrop-blur-sm`), white text, host label truncated to ~24 chars + external-link icon.
- `target="_blank" rel="noopener noreferrer"`.

**Files:** `components/ui/article-card.tsx`.

**Acceptance:** badge visible on all cards with `source_url`; existing footer `Source:` link removed; clicking badge opens source in new tab without navigating off the home view.

**Risk:** LOW.

---

### Phase 8 — Share button (M5 + 2.G — both surfaces) ✅ **COMPLETE 2026-05-02** — **§0k**
- New `components/ui/share-button.tsx` (`'use client'`) — single client island used on both card and detail.
- Behavior: feature-detect `navigator.share`; if available, prefer (`{title, url}`); else `navigator.clipboard.writeText(url)` + 1.5s "Copied" inline label state (no portal/toast lib).
- Telemetry: `share_initiated { surface: 'card'|'detail', channel: 'native'|'copy' }` — fire-and-forget POST to a lightweight endpoint, or temporarily `console.log` until telemetry helper exists.
- Card footer: between View Full Article and Bookmark icons.
- Detail footer action row: beside Bookmark.
- Both invocations import the same component; differ only in `variant` prop (`card` | `detail`) for icon size/label.

**Files:** new `components/ui/share-button.tsx`; modify `components/ui/article-card.tsx`; modify `app/(main)/nuggets/[id]/[slug]/page.tsx`.

**Acceptance:**
- On HTTPS Chrome/Safari mobile, native share sheet opens; on desktop fallback, clipboard + "Copied" label for 1.5s.
- Bundle delta < 2 KiB gzip.
- No console errors when clipboard API unavailable (e.g. http://localhost without TLS — graceful fallback shows "Copy failed").

**Risk:** LOW.

---

### Phase 9 — Active filters bar (M3) ✅ **COMPLETE 2026-05-02** — details in **§0m**
- Renders only when `tags.length > 0 || q.length > 0` (stream alone doesn't count).
- Removable pill per active filter (`{label} ✕`, `Search: "{q}" ✕`).
- Right-aligned **Clear all** clears `tags` + `q`, preserves `stream`.
- Position: between chip rail and grid; not sticky.
- All wiring via `nuqs` — no new state.

**Files:** new `components/feed/active-filters-bar.tsx`; modified `app/(main)/page.tsx`.

**Risk:** LOW.

---

### Phase 10 — Filters popover with tag counts (F1, flat) ✅ **COMPLETE 2026-05-02** — details in **§0n**
- Trigger: end-of-rail `More (N)` chip in `tag-chip-rail.tsx` (replaces the current Show-more expand).
- Desktop: anchored popover (`<details>` + `<dialog>` polyfill, no portal lib) with: search-within-tags input, **flat** checkbox list (no dimension grouping per §2.D), **Apply** and **Clear** buttons. (Shipped as centered modal — see §0n deviation.)
- Mobile: same `<dialog>` rendered as a bottom sheet (`position:fixed; inset-x-0; bottom-0; rounded-t-xl`).
- **Tag counts inline**: each row shows `Macro · 14`. Counts computed by `select unnest(tag_slugs), count(*) from articles where status='published' and content_stream=$1 group by 1` — cached for 1h via `unstable_cache`. (Shipped as JS aggregation — see §0n deviation.)
- Selection writes to `tags` nuqs param. No new deps.
- Focus trap on open, restore focus to trigger on close.
- Mobile sheet: swipe-down or backdrop-click closes. (Backdrop only — see §0n deviation.)

**Files:** new `components/feed/filter-popover.tsx`; modify `components/feed/tag-chip-rail.tsx`; new `lib/queries/tag-counts.ts`; modify `app/(main)/page.tsx` to pass counts.

**Acceptance:**
- Trigger appears at end of rail; disabled state when `tags.length === 0`.
- Popover lists every official tag with count.
- Apply commits to URL; Clear resets `tags` to null.
- Bundle delta < 4 KiB gzip.

**Risk:** MEDIUM — the trickiest UI in the plan; bottom sheet + popover anchoring + focus trap.

---

### Phase 11 — Suggest cap verification (M8 / SR1) ✅ **COMPLETE 2026-05-02** — details in **§0e**
- Confirmed **`suggestArticles`** enforces the **8-row** PMF cap (now **`SEARCH_SUGGEST_ROW_CAP`** + **`.limit(Math.min(…))`**).
- Spot-check **`ilike` vs `textSearch`:** production path correctly uses FTS on **`search_vector`** per blueprint §6.2a — **do not replace with title `ilike` without explicit product/schema change.**

**Files:** `lib/queries/article.ts`, `lib/queries/index.ts` (constant re-export).

**Risk:** LOW — diagnostic + explicit cap enforcement.

---

### Phase 12 — Infinite scroll diagnostic (S1) ⏸ **DEFERRED 2026-05-02** — details in **§0o**
- Only if data shows the issue is real (count > 24 in active stream and sentinel still doesn't trigger).
- Add a one-shot `console.debug` in the IO callback in dev; verify `nextCursor` is non-null after page 1; check ancestors of `<FeedPager/>` for `overflow-hidden`.
- No code change unless evidence demands.

**Risk:** LOW.

---

### Phase 13 — Card-excerpt markdown JIT (§2.I)

**Scope:**
- New `lib/ui/excerpt-markdown.ts` exporting `renderExcerptMarkdown(markdown: string, articleId: string, updatedAt: string): Promise<string>`.
  - Pipeline: `unified` → `remark-parse` → `remark-gfm` → `remark-rehype` → `rehype-sanitize` (strict allowlist: `p, em, strong, code, a, ul, ol, li, blockquote, br`) → `rehype-stringify`.
  - Wrap inner pipeline in `unstable_cache(fn, ['excerpt-html', articleId, updatedAt], { revalidate: 86400 })`.
- Truncate sanitized HTML to ~280 chars at a tag boundary (utility `truncateHtmlAtBoundary`); fall back to plain-text strip if HTML parsing fails.
- `components/ui/article-card.tsx` (or `card-body.tsx` once Phase 16 lands first — order matters, see §10):
  - Replace `<p>{excerptCard}</p>` plain-text path with `<div className="prose prose-sm prose-zinc dark:prose-invert max-w-none ..." dangerouslySetInnerHTML={{ __html: html }} />`.
  - Keep `formatExcerptForCard` as graceful fallback when `article.excerpt` is null/undefined.
- Verify the deps already exist (`react-markdown` + `remark-gfm` are installed for `<ArticleBody/>`; `unified`, `rehype-sanitize`, `rehype-stringify`, `remark-rehype` are likely already transitive). Install only what's missing — confirm against `CLAUDE.md` forbidden-packages list (none of these are forbidden).

**Files:** new `lib/ui/excerpt-markdown.ts`; modify `components/ui/article-card.tsx` (or `card-body.tsx`).

**Acceptance:**
- Card excerpts render bold/italic/code/lists/links inline.
- No `react-markdown` in client bundle on Home (verify via `node scripts/check-bundle-budget.mjs` — Home delta = 0 KB).
- Cache-warmth verified: second request to same article doesn't re-parse markdown (instrument with a one-shot `console.time` in dev).
- XSS safety: feed an article with `<script>alert(1)</script>` in `excerpt`; sanitizer drops it; `<a href="javascript:...">` becomes `<a>` without href.
- `npm run build` exit 0; bundle budget unchanged.

**Risk:** LOW — server-only change, no UI restructure.

---

### Phase 14 — Multi-image card rendering (§2.J — Tier 1: `unoptimized`)

**Scope:**
- New `lib/ui/is-image-url.ts` — port the heuristics from `docs/CARD_MEDIA_IMAGE_URL_PATTERNS.md` §1–6. Pure function `isImageUrl(url: string): boolean`.
- `lib/queries/feed.ts` — extend the article projection to include up to 4 rows from `article_media` ordered by `sort_order` (LIMIT 4 per article) where `media_kind = 'image'` (or analogous column — verify against current schema). Output shape: `images: { url: string; alt: string | null }[]` on each card row.
- New `components/ui/card-thumbnail-grid.tsx` (Server Component) — pure layout component:
  - 1 image: `aspect-video` `<Image>` (or `<img>` fallback for non-allowlisted hosts when `unoptimized` doesn't apply).
  - 2 images: `grid-cols-2` 50/50 split.
  - 3 images: `grid-cols-2` with first cell `row-span-2`.
  - 4+ images: `grid-cols-2 grid-rows-2` with `+N` overlay on cell 4.
- `components/ui/card-media.tsx` (created in Phase 16) — route to single hero or `<CardThumbnailGrid/>` based on count.
- `next.config.ts` — `images.remotePatterns` adds: `pbs.twimg.com`, `i.redd.it`, `preview.redd.it`, `i.imgur.com`, `media.licdn.com`. For each, the corresponding `<Image>` tag uses `unoptimized={true}` until Phase 14.5.
- A small helper `shouldOptimizeImage(host: string): boolean` returns `true` for `res.cloudinary.com` and `i.ytimg.com` only.

**Files:** new `lib/ui/is-image-url.ts`, new `components/ui/card-thumbnail-grid.tsx`; modify `lib/queries/feed.ts`, `components/ui/article-card.tsx` (or `card-media.tsx`), `next.config.ts`.

**Acceptance:**
- Articles with ≥2 image rows render the grid layout per spec.
- Articles with 1 image render the existing single-image hero (unchanged).
- Twitter / Reddit / Imgur / LinkedIn images render (no gradient placeholder); `<Image>` props `unoptimized` correct per host.
- Vercel image-optimizer requests not made for non-allowlisted hosts (verify in Network tab — request URL is the source URL, not `_next/image`).
- LCP regression check on Home — confirm first card hero still hits Cloudinary path.
- `npm run build` exit 0; bundle delta = 0 (Server Components throughout).

**Risk:** LOW–MEDIUM — schema query expansion is the highest-risk part; bench query plan before merge.

---

### Phase 14.5 — Cloudinary `image/fetch` proxy for external UGC (§2.J — Tier 2)

**Scope (separate ticket, ~2 weeks after Phase 14):**
- Helper `cloudinaryFetchUrl(externalUrl: string, opts?: { width?: number }): string` — constructs `https://res.cloudinary.com/{cloud}/image/fetch/f_auto,q_auto,w_{width||768}/{encodeURIComponent(externalUrl)}`.
- `<CardThumbnailGrid/>` and `<CardMedia/>` switch external URLs through this helper. `unoptimized={true}` is removed.
- `remotePatterns` shrinks back to single entry: `res.cloudinary.com`. Drop the Tier-1 host entries.
- Verify Cloudinary `fetch_url_enabled` is on and a CDN-level cache is in place.

**Acceptance:**
- All external images are served from `res.cloudinary.com/image/fetch/...`.
- Vercel quota usage unchanged from pre-Phase-14 baseline (all optimization is Cloudinary's).
- Smart-crop verified on at least one Twitter image with off-center subject.

**Risk:** LOW — URL-construction-only change once helper is in.

---

### Phase 15 — Sheet/parallel-route detail (§2.K)

**Scope:**
- Extract `<ArticleContent/>` from `app/(main)/nuggets/[id]/[slug]/page.tsx` into `components/ui/article-content.tsx` (Server Component). Take `id` and `slug` as props. Canonical route remains the wrapper that supplies `<Suspense>` + metadata + `permanentRedirect` slug-canonicalization.
- New `components/ui/sheet.tsx` (`'use client'`) — single client island:
  - Props: `children`, `onClose`, `variant: 'right' | 'bottom'`.
  - Behavior: focus trap (focus first focusable on mount, restore on close), escape closes, backdrop click closes, swipe-down-to-close on `bottom` variant.
  - Animation: slide-in over 200ms; `motion-reduce:` snap.
  - Accessibility: `role="dialog" aria-modal="true" aria-labelledby={titleId}`.
  - Close calls `router.back()` so URL traversal is native.
- `app/(main)/layout.tsx` — accept `modal` slot:
  ```tsx
  export default function Layout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
    return (
      <NuqsAdapter>
        <Header />
        <main>{children}</main>
        {modal}
        <Footer />
      </NuqsAdapter>
    );
  }
  ```
- New `app/(main)/@modal/default.tsx` — `export default function Default() { return null; }`. Required.
- New `app/(main)/@modal/(.)nuggets/[id]/[slug]/page.tsx` — intercepts feed-originated nav. Inside: `<Sheet variant={isMobile ? 'bottom' : 'right'}><ArticleContent id={id} slug={slug} /></Sheet>`. The mobile-vs-desktop variant is handled via responsive Tailwind (`lg:` classes) inside the sheet itself rather than a JS check, to keep it server-renderable.
- `components/ui/article-card.tsx` — `<Link href={`/nuggets/${id}/${slug}`}>` unchanged. Next 15 routing handles the intercept automatically based on origin.

**Acceptance (smoke test required):**
- Click card from `/?stream=pulse&tags=macro` → sheet opens; URL becomes `/nuggets/[id]/[slug]`; grid behind preserved (DOM unchanged); scroll position preserved.
- Press Escape or click backdrop → sheet closes; URL returns to `/?stream=pulse&tags=macro`; scroll position preserved; filters preserved.
- Click another card from sheet-open state — first sheet closes, second opens (no nesting).
- Direct URL paste of `/nuggets/[id]/[slug]` in a fresh tab → renders the canonical full page (no sheet, no parallel slot leak).
- Browser back from sheet → closes sheet, not navigates feed.
- Browser forward → re-opens sheet.
- Share link from sheet → copies canonical `/nuggets/[id]/[slug]` URL.
- Filter change from chip rail with sheet open → grid behind re-fetches; sheet stays open.
- Reduced-motion: sheet snaps without animation.
- Mobile (`<lg`): sheet anchors bottom; grid behind visible above.
- Bundle delta on Home: ≤5 KB gzip (sheet shell). Verify with bundle-budget script.

**Files:** modify `app/(main)/layout.tsx`; new `app/(main)/@modal/default.tsx`; new `app/(main)/@modal/(.)nuggets/[id]/[slug]/page.tsx`; new `components/ui/sheet.tsx`; new `components/ui/article-content.tsx`; modify `app/(main)/nuggets/[id]/[slug]/page.tsx` to consume extracted component.

**Risk:** MEDIUM — parallel slots + intercepting routes have known sharp edges in Next 15 (default.tsx discipline, prefetch interaction). The smoke checklist above is non-negotiable for merge.

**Rollback:** revert PR. `@modal` slot returns to `null`; intercepting route file removed; canonical route consumes the extracted `<ArticleContent/>` unchanged.

---

### Phase 16 — Card typography + componentization (§2.L)

**Scope:**
- Decompose `components/ui/article-card.tsx` into:
  - `components/ui/article-card.tsx` (orchestrator, ~60 lines).
  - `components/ui/card-media.tsx` (single-image / YouTube overlay; will host source pill from Phase 7 and multi-image grid from Phase 14).
  - `components/ui/card-body.tsx` (tags + title + excerpt; will host the sanitized-HTML excerpt from Phase 13).
  - `components/ui/card-footer.tsx` (CTA pill + date + bookmark; will host share button from Phase 8).
- Typography:
  - Body: `text-sm leading-snug tracking-tight text-muted line-clamp-3 lg:line-clamp-4`.
  - Title: `text-base font-semibold leading-snug line-clamp-2` (unchanged — already correct).
  - Tag pills: `text-xs font-medium px-1.5 py-0.5 border border-border bg-surface-raised rounded-full text-muted`.
  - Footer meta (date): `text-xs text-muted` (unchanged).
  - "View Full Article" CTA: convert from inline text link to `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-muted hover:text-primary hover:bg-surface-raised min-h-[44px]`.
- All four files Server Components. No client islands added in this phase. (Bookmark/Share remain their existing client islands; `<CardFooter/>` composes them.)

**Files:** modify `components/ui/article-card.tsx`; new `components/ui/card-media.tsx`, `card-body.tsx`, `card-footer.tsx`.

**Acceptance:**
- Visual diff against pre-phase: body type tighter, CTA pill restyled, tag pill padding tighter. Title unchanged.
- Each new file <100 lines; orchestrator <80 lines.
- Bundle delta: 0 KB (Server Components).
- `npm run build` exit 0.

**Risk:** LOW — refactor + CSS-only.

**Sequencing note:** Phase 16 should land **before** Phase 13 (the markdown JIT plugs into `<CardBody/>`) and **before** Phase 15 (the sheet's `<ArticleContent/>` is parallel work but card body changes are independent). See §10 for the resolved order.

---

## 6. Cross-cutting concerns

- **Performance budgets** (`CLAUDE.md`): Home JS ≤ ~85 KiB gzip. After each phase, run `node scripts/check-bundle-budget.mjs` and confirm. Phases 6 / 12 are the highest-risk for budget.
- **Accessibility:** every new interactive control must have `aria-label`, visible focus ring, ≥44px tap target. Bottom sheet + popover need focus trap.
- **Reduced motion:** any new animation honors `motion-reduce:` (no fade-in-up; instant snap).
- **No new deps** — confirmed against the forbidden list. Toast for share is a single piece of local state, no library.
- **CSP:** youtube embed uses `youtube-nocookie.com`; already allowed in `frame-src`. No CSP edits planned.
- **Telemetry:** events `share_initiated`, `youtube_play` referenced in `PRODUCT` §9 / §6.3a — implement as fire-and-forget POSTs (or reuse whatever telemetry helper exists).

## 7. Out of scope / explicitly deferred

- v1 PublicHomeIntro / ValueStrip / PulseIntroBanner (M7).
- `/account` page UX (PRODUCT §0.13 minimal — not blocking).
- Tag dimension grouping (frozen out §11.1).
- Sort dropdown, view-mode toggle, OR-mode tags, saved filter presets, dimension-grouped chip rail (frozen out §11.1).
- Per-card admin Edit/Draft-Publish/Delete actions (kept on `/admin/...` only).
- Three-dot card menu (Add-to-collection / Report).
- ~~Modal/drawer reading pattern (frozen out — canonical detail page only).~~ **AMENDED 2026-05-01 — see §2.K.** Parallel-slot + intercepting-route sheet is permitted (Phase 15). Context-driven modals remain banned.

---

## 8. Implementation discipline

1. One PR per phase. No phase merges without `npm run build` exit 0 and bundle budget check.
2. No deps added.
3. Server Components stay Server Components. New client islands must be a single file with a single concern.
4. Tests: each phase adds at minimum a smoke test for the touched route(s) — manual browser check counts as a test record in the PR description (per `CLAUDE.md` "test the golden path").
5. Doc updates: when a phase ships, update `docs/HOMEPAGE_UI_UX_SESSION_CHANGELOG.md` with what changed and why.

---

## 8a. Re-evaluation cross-reference (2026-05-01)

A separate engineering audit re-derived the technical root cause of the legacy "click lag" and re-validated each performance/architecture rule under v2:

→ `docs/PERFORMANCE_RULES_REEVALUATION.md`

Headline findings:
- "Click lag" was caused by `FilterStateContext` cascading into a fully-hydrated client tree. v2's RSC + `nuqs` + thin-island architecture **structurally eliminates** that cascade.
- Several "frozen" rules whose stated rationale was perf are now defended only by UX / editorial reasoning. They aren't *wrong* — but they are no longer load-bearing on perf grounds.
- Decisions 2.A and 2.B above now stand on UX grounds; their original perf justification has weakened. **User confirmed 2026-05-01: minimalist content-density approach is the explicit preference. Both decisions locked, no revisit.**
- Decisions 2.E and 2.F (drop three-dot menu, drop card admin actions) are *strengthened* by the audit on hydration-cost grounds.
- Bundle budget, no-context-above-cards, no-react-markdown-on-cards, no-iframe-on-cards, batched bookmark hydration, no TanStack Query, no framer-motion, RSC default — all **strongly retained**.
- Real risks that persist regardless of architecture (sticky chrome on mobile, body-text markdown cost, iframe lazy loading, virtualization temptation, focus traps, web fonts, revalidation stampedes, search request explosion) — listed in audit §4 for ongoing discipline.

---

## 9. Decisions tracker (closed)

| ID | Decision | Resolution | Closed |
|---|---|---|---|
| 2.A | Stream tabs surfacing | Body chrome, magazine-section style under header | 2026-05-01 |
| 2.B | Header nav links | Strip; surface destinations via avatar dropdown + mobile bottom nav | 2026-05-01 |
| 2.C | Grid columns at xl | 1/2/3/4 at base/md/lg/xl — overrides §3.4 | 2026-05-01 |
| 2.D | Tag popover grouping | Flat list with per-tag counts; trigger via end-of-rail `More (N)` chip | 2026-05-01 |
| 2.E | Three-dot card menu | Drop. Use explicit icon row (Bookmark · Share · Source) | 2026-05-01 |
| 2.F | Card admin Edit/Delete | Drop from cards; admin Edit on detail + bulk on `/admin/articles` | 2026-05-01 |
| 2.G | Card share | Both surfaces use shared `<ShareButton/>` | 2026-05-01 |
| 2.H | Create-nugget link | Avatar dropdown only when `is_admin` | 2026-05-01 |
| 2.I | Card-excerpt markdown rendering | JIT in RSC + `unstable_cache` per `id+updated_at` + `rehype-sanitize`. No HTML-in-DB. | 2026-05-01 (later) |
| 2.J | Card multi-image rendering | Plumb `article_media`; Tier 1 `unoptimized={true}` for external hosts; Tier 2 Cloudinary `image/fetch` proxy ~2 weeks out | 2026-05-01 (later) |
| 2.K | Detail reading pattern | Parallel-slot + intercepting-route sheet. **Overrides §7 + scoped lift of `CLAUDE.md` modal ban.** Context-driven modals stay banned. | 2026-05-01 (later) |
| 2.L | Card body typography | Body `text-sm leading-snug tracking-tight` (overrides spec `text-xs`); title unchanged; CTA → quiet `rounded-full` pill. Componentize card during the same PR. | 2026-05-01 (later) |

## 10. Phase priority summary

| # | Phase | Priority | Risk | Depends on |
|---|---|---|---|---|
| 1 | P0 visual fixes (L1, L2, L3, C2, C3, C6) | P0 | LOW | — |
| 2 | YouTube hero fallback (C1) | P0 | LOW | — |
| 3 | Header strip + auth island extension | P1 | LOW | Phase 1 |
| 4 | Stream tabs restyle + mobile bottom nav | P1 | LOW–MED | Phase 3 |
| 5 | Site footer | P1 | LOW | — |
| 6 | YouTube state machine on detail | P1 | MED | — |
| 7 | Card source badge | P1 | LOW | Phase 1 |
| 8 | Share button (card + detail) | P1 | LOW | — |
| 9 | Active filters bar | P2 | LOW | Phase 1 |
| 10 | Filters popover + tag counts | P2 | MED | Phase 1 |
| 11 | Suggest cap verification | P2 | LOW | — |
| 12 | Infinite scroll diagnostic | P2 | LOW | data check |
| 16 | Card typography + componentization | **P0** | LOW | — |
| 13 | Card-excerpt markdown JIT | **P0** | LOW | Phase 16 (clean target file) |
| 14 | Multi-image card rendering | P1 | LOW–MED | Phase 16 |
| 15 | Sheet/parallel-route detail | P1 | MED | Phase 16, Phase 13 |

*Phase 11 is complete (2026-05-02) — see **§0e**.*

**Resolved build order (amendment batch):** ~~16~~ → ~~13~~ → ~~14 (Tier 1)~~ → ~~15~~ → ~~11~~ → ~~2~~ → ~~3~~ → ~~4~~ → ~~5~~ → ~~7~~ → ~~8~~ → ~~6~~ → ~~9~~ → ~~10~~ → ~~12 (deferred)~~ → 14.5 (scheduled). Phases 16, 13, 14 (Tier 1), and 15 shipped 2026-05-01 (see §0b, §0c, §0d). **Phase 11** verified 2026-05-02 (§0e). **Phase 2** shipped 2026-05-02 (§0f). **Phase 3** shipped 2026-05-02 (§0g). **Phase 4** shipped 2026-05-02 (§0h). **Phase 5** shipped 2026-05-02 (§0i). **Phase 7** shipped 2026-05-02 (§0j). **Phase 8** shipped 2026-05-02 (§0k). **Phase 6** shipped 2026-05-02 (§0l). **Phase 9** shipped 2026-05-02 (§0m). **Phase 10** shipped 2026-05-02 (§0n). **Phase 12** deferred 2026-05-02 (§0o — diagnostic-only, awaits real failure data). **Phase 14.5** scheduled 2026-05-02 to fire 2026-05-15T03:30:00Z via remote routine `trig_01SDqvQfNqxCYY7ySpinPrY6` (see §0p).
