# Performance & Architecture Rules — Re-evaluation Audit

**Date:** 2026-05-01
**Author:** Claude (engineering audit)
**Trigger:** user request to independently re-evaluate every founder-identified perf/responsiveness issue from the legacy app and re-validate v2 rules under the new architecture.
**Posture:** treat the founder's diagnoses as *symptoms* — derive technical root causes from first principles, then test each surviving rule against current architecture (Next.js 15 App Router, RSC, Supabase, nuqs, CDN ISR).

---

## 0. TL;DR

1. The founder's "click lag" report is real but its **stated cause** ("header has too many elements") is **second-order**. The technical cause was a CSR-only React app whose `FilterStateContext` (and sibling stores) sat above a large, fully-hydrated component tree. Every header click cascaded re-renders into the feed grid.
2. v2 architecture (RSC + Server Actions + `nuqs` URL state + thin client islands + ISR) **structurally eliminates** the cascade. A click on a `next/link` in v2 cannot re-render the feed grid because the feed grid lives in a Server Component subtree.
3. **Several "frozen" rules whose stated rationale was perf are now defended only by UX / editorial reasoning.** They aren't *wrong* — they may still be right — but their technical justification has dissolved.
4. **Several rules survive unchanged or strengthened.** Bundle budget, no-context-above-cards, no-react-markdown-on-cards, batched bookmark hydration, no TanStack Query, no framer-motion, RSC default — all remain technically essential.
5. **There are real risks that persist regardless of architecture** — these are listed in §6 and need ongoing engineering discipline, not just architectural posture.

---

## 1. Decoding the founder's diagnosis — first-principles analysis

### 1.1 Reported symptom

> "Click lag in the header" — paraphrased from `PRODUCT` §3.3 and §11.1.

### 1.2 Plausible technical causes (without assuming the founder is right)

INP / interaction lag in a React SPA has a small, finite set of causes:

| # | Cause | Mechanism | Likelihood in v1 |
|---|---|---|---|
| A | Long event handlers blocking the main thread | Synchronous filter/sort logic in `onClick` | HIGH |
| B | Cascading re-renders from context above large trees | `FilterStateContext` → `ArticleGridContext` → cards | **HIGHEST** |
| C | Hydration in progress when user clicks | CSR-only Vite bundle parsing/booting | MEDIUM |
| D | JS bundle parse/eval CPU monopoly | Large initial bundle (no code-split, no streaming) | HIGH |
| E | Network in click critical path | Filter click triggers fetch with no optimistic UI | MEDIUM |
| F | Layout thrash on filter UI rendering | `FilterScrollRow` + `TaxonomySidebar` + chip overflow recompute | MEDIUM |
| G | Heavy CSS recalc on hover/focus | framer-motion + complex selectors | MEDIUM |

### 1.3 Where the v1 spec writer pinned the cause

> "v1 nested filter affordances, search overlays, sub-toolbars, and stream switchers in the header — that chrome breadth is a primary cause of the click lag the founder described." (`PRODUCT` §3.3)
>
> "v1's filter component sprawl (8+ modules feeding `FilterStateContext`) is a primary cause of the click-lag the founder described." (`PRODUCT` §11.1)

The two statements pin the cause to two different things — *element count in the header* (3.3) and *FilterStateContext sprawl* (11.1). **The 11.1 framing is the technically correct one.** 3.3 is a paraphrase that conflates "components in the header" with "components that subscribe to a global store." The two are not the same.

### 1.4 Implication

> **A `next/link` in the v2 header is not the same animal as a `FilterStateContext`-subscribed button in the v1 header.**

The lag was caused by **what the elements *did when clicked*, not where they sat in the DOM.** Specifically: each click in v1 mutated a context above the feed grid, and the entire client tree downstream re-reconciled. v2 flips the responsibility model:

- URL-driven nav (`next/link`) → server router handles the change → RSC streams new HTML → no client tree reconciliation in the feed grid.
- nuqs filter writes → URL change → RSC re-render of the homepage → client islands keep their state, no cascade.
- Server Actions for mutations → no client-side state churn.

So the v2 architecture **structurally** prevents the v1 failure mode for any nav element that:
1. Routes via `next/link` or nuqs URL write, AND
2. Doesn't subscribe to a context above the feed grid, AND
3. Isn't itself a heavy client island that re-renders on every URL change.

This dissolves the perf justification for the "thin header" rule. The rule may survive on **UX / editorial / bundle-budget** grounds, but not on click-lag grounds.

---

## 2. Rule-by-rule re-evaluation

Format: each row = `Rule → original reason → v2 architectural reality → verdict`. Verdict ∈ {KEEP, REFINE, RELAX, REMOVE}.

### 2.1 Header chrome rules

| Rule | Original reason | v2 reality | Verdict |
|---|---|---|---|
| Header stays thin (4 elements) — `PRODUCT` §3.3 | Click lag from header chrome | Click-lag mechanism is gone (RSC + nuqs). Surviving justification: bundle budget (each interactive element ≈ potential client island) + editorial cleanliness. | **REFINE.** Constraint shifts from "no chrome in header" to "no client islands in header beyond search + auth + theme + bell." Static `next/link` nav links are fine — they cost ~0 client JS. |
| No stream switcher in header — §3.3 | Click lag | Same as above — no perf cost in v2. Surviving justification: editorial pattern (section nav below masthead globally — NYT/Bloomberg/FT). | **REFINE.** Move to UX reasoning. Either placement is technically OK. |
| Header NOT sticky PMF — §3.3 | "More vertical room for grid" | Sticky header costs near-zero perf (single GPU layer). | **REFINE.** Pure UX rule, not perf rule. Re-decide on UX merits. |
| Search overlay full-screen on mobile | UX hint, no perf | A heavy modal + focus trap + body lock is real INP risk if poorly implemented. | **KEEP** with diligence note. |

### 2.2 Filter chrome rules

| Rule | Original reason | v2 reality | Verdict |
|---|---|---|---|
| No filter sidebar — §11.1 | (a) 250px width loss, (b) fat client widget tree, (c) one-mental-model | (a) layout cost still real on desktop. (b) widget tree no longer fat — RSC renders the list, single client island handles selection. (c) one-mental-model still right. | **KEEP** but for different reasons (layout efficiency + mental-model consistency, NOT widget-tree perf). |
| No dimension grouping in chip rail — §11.1 | "Recreates v1 sidebar" | Curated set ~12–30 chips makes grouping low-value. RSC renders groups cheaply now. | **REFINE.** Spec rationale is mostly UX (low chip count → grouping adds overhead without scan benefit), not perf. Could be revisited if curated set grows. |
| Tag chip rail collapses to ≤ 12 with Show-more | Implicit perf assumption | Cost of rendering 30 chips in a horizontal scroll lane is negligible (no virtualization needed). Show-more is anti-pattern (push-down content). | **REMOVE.** Replaced by single-row scroll + end-of-rail `More (N)` chip per spec. (Already in remediation plan.) |
| No sort dropdown — §11.1 | Avoid v1 chrome bloat | UX decision; near-zero perf cost. | **REFINE.** Pure UX rule. Could add later if metrics show users want it. |
| No view-mode toggle (grid/list/compact) | Same | Same | **REFINE.** Pure UX rule. |
| No saved filter presets | Same | Adds modest client state but not necessarily a perf hazard. | **REFINE.** Pure UX rule. |

### 2.3 Card / feed perf rules

| Rule | Original reason | v2 reality | Verdict |
|---|---|---|---|
| `ArticleCard` is a Server Component | Bundle + hydration | Each non-island card ≈ 0 KB client JS × 24 = huge perf saver. | **KEEP, strengthen.** This is the single highest-value rule on the home page. |
| Bookmark = thin client island only | Avoid grid re-render | Custom-event hydrator pattern works. | **KEEP.** |
| `priority={true}` on first card only | LCP optimization | Still the right LCP hook in Next/Image. | **KEEP.** |
| No bookmark state in context above cards | Re-render cascade | Same hazard would exist in v2 if violated. | **KEEP, strengthen.** |
| No react-markdown on cards | ~50 KB gzip + parse cost × 24 cards | Pure-function `stripMarkdown` is the right call. | **KEEP, strengthen.** |
| Batched bookmark check ≤ 24 IDs / page | Avoid N round-trips | Still valid; existing hydrator does this. | **KEEP.** |
| `aspect-video` fixed media frame | CLS | Still the right CLS hook. | **KEEP.** |
| 16:9 aspect everywhere | CLS + content density | Still right. | **KEEP.** |

### 2.4 Data / pagination rules

| Rule | Original reason | v2 reality | Verdict |
|---|---|---|---|
| Server-render page 1 (RSC) | LCP + JS | Still right. | **KEEP, strengthen.** |
| Pagination via `IntersectionObserver` + `fetch` + `useTransition` | No lib weight | TanStack Query would add ~12 KB + duplicate cache + clash with `revalidateTag`. Native is correct. | **KEEP.** |
| 24-card page size | Latency × density × bookmark batch cap | Still right. | **KEEP.** |
| Cursor `{published_at, id}` | Tie-breaker stability | Still right. | **KEEP.** |
| ISR Pulse 120s / Standard 300s | Freshness vs cache | Still right. | **KEEP.** |
| No-store on filter/search URLs | Personalised content not cacheable | Still right. | **KEEP.** |
| Abort in-flight fetch on filter change | Stale results | Still right. | **KEEP.** |

### 2.5 State-management rules

| Rule | Original reason | v2 reality | Verdict |
|---|---|---|---|
| `nuqs` as URL state | No useState/context drift | Still right; structurally prevents v1 cascade. | **KEEP, strengthen.** |
| `NuqsAdapter` only in `(main)/layout.tsx` | Scope | Still right. | **KEEP.** |
| No `useEffect` to fetch what server can | Hydration cost + waterfall | Still right. | **KEEP, strengthen.** |
| No global stores (zustand/redux/jotai/recoil/mobx/valtio/xstate) | Bundle + cascade risk | URL-as-state covers all PMF needs. | **KEEP.** |
| Local card state for bookmarks (custom event hydrator) | Avoid context lift | Still right. | **KEEP.** |

### 2.6 Bundle / dependency rules

| Rule | Original reason | v2 reality | Verdict |
|---|---|---|---|
| 85 KiB Home JS budget | LCP / INP / mobile | Still right; the budget is a **tripwire**, not arbitrary. | **KEEP, strengthen.** |
| 60 KiB detail route budget | Same | Still right. | **KEEP.** |
| Forbidden: framer-motion | ~30 KB + main-thread animation | CSS transitions cover all PMF cases. | **KEEP, strengthen.** |
| Forbidden: TanStack Query / virtual | Lib weight + duplicate cache / over-engineering | Still right. | **KEEP.** |
| Forbidden: date-fns/dayjs/moment/luxon | ~10–60 KB; `Intl.DateTimeFormat` covers all needs | Still right. | **KEEP, strengthen.** |
| Forbidden: react-modal/react-spring/auto-animate | UX + bundle | Still right. | **KEEP.** |
| Forbidden: `slugify` npm | Scripts/shared/slug.ts internal | Still right. | **KEEP.** |
| Forbidden: rehype-raw | XSS | Security rule, not perf — still right. | **KEEP.** |
| Forbidden: `is_published` column | Schema | Still right. | **KEEP.** |

### 2.7 Loading-UX contract rules

| Rule | Original reason | v2 reality | Verdict |
|---|---|---|---|
| Never blank white | Perceived perf | Still right. | **KEEP, strengthen.** |
| Skeletons appear within one frame on filter change | Perceived perf | The `useTransition`-wrapped nuqs write enables this; skeleton must be in `<Suspense fallback>`. | **KEEP.** |
| No spinner-only loading | Perceived perf | Still right. | **KEEP.** |

### 2.8 YouTube / iframe rules

| Rule | Original reason | v2 reality | Verdict |
|---|---|---|---|
| No iframe on Home cards | Iframe = 100s of KB + main-thread + privacy | Absolutely still right. | **KEEP, strengthen.** |
| Poster-first state machine on detail | LCP / privacy / bytes | Still right. | **KEEP.** |
| Never autoplay | UX + bytes | Still right. | **KEEP.** |
| `youtube-nocookie.com` only | CSP / privacy | Still right. | **KEEP.** |

### 2.9 Search rules

| Rule | Original reason | v2 reality | Verdict |
|---|---|---|---|
| Debounce 180ms / min 2 chars / cap 8 rows | Perceived latency vs server load | Industry-standard band; still right. | **KEEP.** |
| `ilike` on title for suggest | Index speed vs FTS overhead | Still right for ≤ 8 rows. | **KEEP.** |
| Rate limit suggest 30/30s/IP | Abuse prevention | Still right. | **KEEP.** |
| Suggest pick navigates, doesn't commit `q` | UX | Still right. | **KEEP.** |

### 2.10 Image / CDN rules

| Rule | Original reason | v2 reality | Verdict |
|---|---|---|---|
| Custom Cloudinary loader with `f_auto, q_auto, c_fill, g_auto` | Bytes / quality | Still right. | **KEEP, strengthen.** |
| `remotePatterns` allows only `res.cloudinary.com` + `i.ytimg.com` | CSP / supply-chain | Still right. | **KEEP.** |
| `sizes` prop tuned per breakpoint | Bytes | Still right. | **KEEP.** |
| `quality={75}` cards / `quality={80}` detail | Bytes / fidelity | Still right. | **KEEP.** |

### 2.11 Rules that can be relaxed under v2

Rules whose **technical** justification has fully dissolved (UX justification may persist):

| Rule | Why it can relax |
|---|---|
| Stream switcher only in body chrome | Perf cost identical in header or body. UX call. |
| Header is not sticky | Perf cost ≈ zero either way. UX call. |
| No nav links in header | A `next/link` is ~0 client JS. Perf cost ≈ zero. Editorial / discoverability call. |
| Show-more on tag chip rail | Already replaced by spec'd `More (N)` chip + popover; the original collapse was an over-fit. |

---

## 3. Concerns from v1 that are **no longer relevant** under v2

These warnings appear in the v2 spec but the architecture has eliminated the underlying mechanism. Carrying them forward as constraints adds unnecessary friction.

| Concern | Why it's gone |
|---|---|
| FilterStateContext cascade re-renders | No global filter context. URL is the state. |
| Modal/drawer URL-sync drift (`openArticle` / `expanded`) | Detail page is a route, not a modal. No URL-sync code path. |
| Bundle bloat from filter-component sprawl (8+ modules) | Single chip rail + popover; client island count ≤ 4 on Home. |
| `useInfiniteArticles` waterfall | Server-renders page 1; client paginates from cursor. No waterfall. |
| Hydration mismatch in HeaderAuth | Resolved (S1-F4 in `AUDIT_REPORT.md`); current `HeaderAuthIsland` owns all auth state on the client. |
| Modal-driven admin CRUD friction | Admin uses route pages + Server Actions. |
| Click handlers blocking main thread for filter math | All filter math is server-side via `tag_slugs @> $1::text[]` GIN. |

---

## 4. Concerns that **persist regardless of architecture** — needs ongoing discipline

These are not "v1 problems" — they're recurring traps in any React + Next.js app. Ongoing discipline matters more than rules.

### 4.1 Client-island count multiplied by feed density
- **Risk:** every interactive control on a card multiplies hydration cost by 24 cards × any sub-island. Even at "thin client island" sizes, 5 islands per card × 24 cards × 1.5 KB each = 180 KB of hydration metadata.
- **Discipline:** any new card-mounted island must be justified individually. Prefer event delegation (one document-level handler) over per-card listeners where possible. The bookmark hydrator's custom-event pattern is the model.
- **Open exposure:** Phase 7 (source badge) is server-only `<a>` — fine. Phase 8 (share button) is one new island per card — within budget but at the limit. **No more new card islands without explicit reason.**

### 4.2 Sticky chrome on mobile
- **Risk:** `position: fixed` headers + scroll listeners cause INP regressions on Android Chrome under jank. iOS rubber-banding can mis-compute layout on fixed elements.
- **Discipline:** if sticky is reintroduced, do it with CSS only (no JS scroll listeners), and verify on a throttled mobile staging build.

### 4.3 Body-text `react-markdown` cost on detail
- **Risk:** detail page already uses `react-markdown` + `remark-gfm` (~50 KB gzip). This is acceptable on the detail route's 60 KB budget but eats half the budget.
- **Discipline:** never extend this to cards. Resist plugin additions (`rehype-raw` is already banned for security; `rehype-highlight`/`rehype-katex` would balloon the budget).
- **Future fix (post-PMF):** convert markdown → HTML at build/save time; serve pre-rendered HTML on detail; eliminate runtime markdown parser entirely.

### 4.4 Iframe lazy loading for YouTube embed
- **Risk:** mounting the YouTube iframe (Phase 6) brings in YouTube's own JS (~600 KB total + multiple subresources). Phase 6's poster-first state machine is the mitigation, but the moment a user clicks "Load video" we're paying that cost.
- **Discipline:** never auto-mount; document the cost in the player component header; consider adding an idle-callback prefetch only for users who hover the poster (post-PMF).

### 4.5 Virtualization temptation
- **Risk:** "infinite scroll feels slow with 200+ cards" → reach for `@tanstack/react-virtual`. This is forbidden; doing it would re-create the v1 component-tree depth that was the original failure mode.
- **Discipline:** if scroll memory becomes an issue, fix via `content-visibility: auto` (CSS-only, browser-native) before reaching for a JS virtualizer.

### 4.6 Filter popover focus trap & body-scroll lock (Phase 10)
- **Risk:** focus trap + `overflow:hidden` on body cause iOS scroll-position jumps; body-scroll-lock is a known INP risk if implemented with JS.
- **Discipline:** use `<dialog>` element's native modal behavior (browser handles focus + scroll). Avoid hand-rolled trap.

### 4.7 Web fonts blocking text paint
- **Risk:** Self-hosted font files without `font-display: swap` block FCP.
- **Discipline:** keep the primary sans font on the system UI stack with no `<link>`-loaded webfont. If a custom font is introduced later, load it via `next/font` with `font-display: swap`.

### 4.8 Long-running Server Action revalidation
- **Risk:** `revalidatePath` / `revalidateTag` on a high-traffic route can stampede the cache.
- **Discipline:** keep revalidation scoped (`revalidateTag('article:' + id)` not `revalidatePath('/')`). The codebase already follows this — preserve it.

### 4.9 Notification panel polling
- **Risk:** The 60s panel-open polling is fine; ensure it stops when panel closes (already enforced by spec §6.6b) — verify in implementation.
- **Discipline:** any future "live" feature must follow the same panel-scoped polling pattern; never background-poll.

### 4.10 Search request explosion
- **Risk:** input `onChange` without debounce → 100+ requests/sec → server pegged.
- **Discipline:** rate-limit (already in place); 180ms debounce (already in place); verify cancellation on unmount + new query (already in place via `cancelled` flag).

---

## 5. Implications for the locked plan

### 5.1 Decisions whose perf-grounded reasoning has weakened

In `HOMEPAGE_UI_UX_REMEDIATION_PLAN.md`:

- **2.A — Stream tabs in header** — was rejected partly on perf grounds. **Perf grounds no longer hold.** Editorial argument (NYT/Bloomberg pattern, magazine-section bar below masthead) still stands but is now the primary justification, not the secondary one.
- **2.B — Header nav links** — same story. Perf cost of `next/link` nav in v2 ≈ 0. Editorial argument (NYT-style "header = utilities only, destinations live in dropdowns + bottom nav") still stands but is now the primary justification.

**Both decisions are still defensible** on UX merits, but the user should know that re-introducing nav links into the header would *not* re-introduce the click-lag failure mode. If the user prefers a more navigation-rich header, the architecture can carry it.

### 5.2 Decisions strengthened by the audit

- **2.E — drop three-dot menu** — additional reason: avoiding new card islands (every card menu = +1 client island × 24 = significant hydration cost).
- **2.F — drop card admin actions** — additional reason: same hydration scaling argument; admin UI on cards forces a per-render `getUser()` or new client island.
- **No iframe on cards** — strengthened.
- **Server Component card** — strengthened.

### 5.3 Decisions unchanged

- **2.C — 4 cols at xl** — overrode `PRODUCT` §3.4 on UX grounds; perf analysis confirms slightly faster LCP at 4 cols. No change.
- **2.D — flat tag popover** — UX reasoning unchanged; spec rationale slightly weaker but still defensible.
- **2.G — share on both surfaces** — within budget; no change.
- **2.H — admin-gate Create-nugget** — unchanged.

---

## 6. Action items from this audit

### 6.1 Documentation
- [x] Save this audit at `docs/PERFORMANCE_RULES_REEVALUATION.md`.
- [ ] Cross-reference from `HOMEPAGE_UI_UX_REMEDIATION_PLAN.md` §2.A and §2.B (next edit).
- [ ] When `PRODUCT` and `BLUEPRINT` are next revised, the §3.3 "thin header" rationale should be amended to cite *bundle/hydration discipline* and *editorial cleanliness*, not *click-lag prevention*. (Carry forward as a follow-up; do not edit those frozen docs in this audit.)

### 6.2 Engineering discipline (no code changes required now)
- Maintain the bundle-budget tripwire — `node scripts/check-bundle-budget.mjs` after every PR.
- Cap card client islands. Currently: bookmark, share (Phase 8). One more is the practical limit before measuring.
- Keep filter popover (Phase 10) on `<dialog>` native semantics — no hand-rolled focus trap.
- Verify notification panel polling cessation on panel close (existing rule, worth a one-time check).
- Consider build-time markdown → HTML conversion for detail body as a post-PMF perf win.

### 6.3 Open question — RESOLVED (2026-05-01)
~~Now that the perf justification for "no header nav" is weaker, does the user want to revisit decision 2.B?~~

User confirmed the minimalist content-density direction. Rationale recorded in `HOMEPAGE_UI_UX_REMEDIATION_PLAN.md` §2.B. Decision **locked**: strip header nav, surface destinations via avatar dropdown + mobile bottom nav + body chrome. This matches the global editorial-app pattern (NYT, Bloomberg, FT, Reuters, Substack, Medium) and maximises vertical space for the card grid above the fold.

---

## 7. Appendix — first-principles INP analysis on a sample interaction

**Scenario:** user clicks the Market Pulse stream tab on the new Home page.

### v1 path (hypothetical reconstruction)
1. Click → React onClick handler on Tab component.
2. `setStream('pulse')` on `FilterStateContext` (above feed grid).
3. Context Consumer re-render cascades to `ArticleGrid`.
4. `ArticleGrid` re-runs `useInfiniteArticles` hook → fetch fires (network in critical path).
5. While waiting, no skeleton — old grid stays on screen.
6. Response arrives, `setState`, re-renders ~24 cards × N nested children.
7. INP: 200–800 ms typical on mid-range mobile.

### v2 path (current code)
1. Click → `<button>` in `stream-tabs.tsx` (client island, ~3 KB).
2. `useTransition(() => setStream('pulse'))` — startTransition wraps the URL write.
3. `nuqs` writes `?stream=pulse`; `shallow:false` triggers Next router.
4. Next router suspends the home segment; `<Suspense fallback={FeedSkeleton}>` shows skeleton **within one frame**.
5. RSC streams new HTML for the segment; client tree below the Suspense boundary swaps to the new server payload.
6. INP: typically < 100 ms — the only main-thread work is the `setState` inside nuqs and the transition scheduling.

### Verdict
The v2 path's INP is **not sensitive to whether the tab lives in the header or in body chrome**. Both placements run the same `setStream` → URL write → RSC flow. The "thin header" rule was protecting against a v1 mechanism that no longer exists.
