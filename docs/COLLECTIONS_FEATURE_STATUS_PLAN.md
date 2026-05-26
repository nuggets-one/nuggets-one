# Collections Feature Status Plan

This is a workspace-local copy of the generated plan so it opens directly in the project tree.

Original generated path:
- `c:\Users\ujval\.cursor\plans\collections_feature_status_8d9004c7.plan.md`

## Phase B — hierarchy (2026-05-25)

1. Migration `20240001000018_collection_hierarchy.sql` — `parent_id`, `is_featured`, `featured_order`
2. Backfill from Mongo: `npm run backfill:collection-hierarchy`
3. Public `/collections` — **8 root topics** sorted by aggregate nugget count (legacy topic chips)
4. Public `/collections/[id]` — parent shows sub-topic grid + direct nuggets; legacy Mongo IDs redirect via `legacy_mongo_id`
5. Admin — parent picker, featured flags

```bash
npm --prefix scripts/migrate run apply:migration -- supabase/migrations/20240001000018_collection_hierarchy.sql
npm run backfill:collection-hierarchy
```

## Phase C — parent sub-topic index (2026-05-25)

**Goal:** Faster jump to sub-collections without a legacy sidebar or Home filter panel.

**Shipped:**

- `CollectionSubtopicIndex` — server-only A–Z link list on parent `/collections/[id]` when there are **6+** sub-topics
- Card grid unchanged below for visual browse
- **Explicitly not shipped:** Home collection filter, full taxonomy sidebar, featured toolbar API

**UX / CWV:**

- Zero client JS; `next/link` only
- Shown only on parent topics with many children (Geopolitics, India, Markets, etc.)

## Navigation UX decision (frozen)

| Option | Decision |
|--------|----------|
| Home collection filter panel | **Defer** — conflicts with §11.1 (`stream` / `tags` / `q` only on `/`) |
| Full `/collections` taxonomy sidebar | **Defer** — 200-link DOM; Phase B + Plan C cover browse |
| Parent A–Z index (Plan C) | **Shipped** |

## Migration run log (2026-05-25)

Completed on this environment:

1. Applied missing DB migrations: `20240001000006_collection_status.sql`, `20240001000007_collection_cover_image.sql`
2. Fixed ETL filter: Mongo `type: 'public'` (not `isPublic`)
3. Ran `npm run etl:collections` — 202 community collections inserted
4. Ran `npm run sync:collection-entries` — +1132 entry rows (article map pagination fix)

Commands for re-run / other envs:

```bash
npm --prefix scripts/migrate run apply:migration -- supabase/migrations/20240001000006_collection_status.sql
npm --prefix scripts/migrate run apply:migration -- supabase/migrations/20240001000007_collection_cover_image.sql
npm run etl:tags
npm run etl:articles
npm run etl:collections
npm run sync:collection-entries
```

Dry-run (pass `--` before flags):

```bash
npm run etl:collections -- --dry-run
npm run sync:collection-entries -- --dry-run
```

## Performance and Core Web Vitals guardrails (must hold)

If Collections is extended, keep these constraints non-negotiable so it does not regress site performance:

- Keep server-first rendering for `/collections` and `/collections/[id]`; do not move list/detail fetching into client `useEffect`.
- Keep client islands thin (bookmark/share only); avoid adding broad client context above the grid.
- Do not add TanStack Query, virtualization, animation libs, or modal-driven state sync patterns on read paths.
- Keep collection cards single-hero and deterministic cover fallback (`cover_image_url` -> first ordered entry hero -> placeholder).
- Preserve Home/detail JS budgets and CWV targets from project rules (`~85 KiB` Home JS, `~60 KiB` detail JS, LCP <= `2.5s`, CLS <= `0.1`).
- If collections admin ships later, use targeted cache invalidation (`revalidateTag('collection:' + id)`) and avoid global cache bust patterns.
- Validate before merge: Lighthouse mobile check on `/collections` and `/collections/[id]`, plus no new lints in touched files.

## PR acceptance checklist (performance + CWV gate)

Use this on every PR touching collections routes, queries, or collection cards.

### 1) Architecture safety

- [ ] `/collections` and `/collections/[id]` remain server-first for primary data (no client `useEffect` fetch for list/detail).
- [ ] No new global/client context provider is introduced above card grids.
- [ ] Client interactivity is limited to thin islands (bookmark/share); no broad hydration of list surfaces.

### 2) Dependency and pattern safety

- [ ] No TanStack Query on collections read paths.
- [ ] No forbidden packages/patterns are introduced (`framer-motion`, modal-driven CRUD in read paths, URL<->state mirror effects).
- [ ] Internal navigation still uses `next/link` (no internal `<a href>` regressions).

### 3) Data/query efficiency

- [ ] List query fetches only fields needed by cards.
- [ ] Detail query fetches only fields needed by header + card grid.
- [ ] Cover fallback remains deterministic: `cover_image_url` -> first ordered entry hero -> placeholder.

### 4) Rendering and media safety

- [ ] Collection cards keep single-hero media treatment (no feed-style multi-image expansion here).
- [ ] `next/image` usage keeps stable dimensions/aspect ratio to avoid layout shift.
- [ ] No new above-the-fold third-party embeds/scripts are added to collections pages.

### 5) Caching and invalidation

- [ ] Any caching change is scoped and justified (avoid broad/global cache busting).
- [ ] If admin editing is added later, invalidation is targeted (`revalidateTag('collection:' + id)`), not feed-wide by default.

### 6) Core Web Vitals verification (required evidence in PR)

- [ ] Lighthouse mobile run for `/collections` attached in PR notes.
- [ ] Lighthouse mobile run for `/collections/[id]` attached in PR notes.
- [ ] No material regression versus baseline on LCP/CLS/INP; target remains LCP <= 2.5s and CLS <= 0.1.
- [ ] Home/detail bundle budgets are not regressed by collections changes (`~85 KiB` home, `~60 KiB` detail guidance).

### 7) Quality gates

- [ ] Lint passes for touched files.
- [ ] Error and empty states still use shared `StatusBlock` component.
- [ ] Anonymous access to `/collections` and `/collections/[id]` still works.
- [ ] No deferred features are accidentally introduced (followers, save/follow collection, bookmark folders).
