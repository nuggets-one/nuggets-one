# Search Reliability Runbook

Operational runbook for RPC-backed homepage search, with rollout order and failure handling.

## Why this exists

Search can depend on DB RPC functions (`search_articles_ranked`, `search_suggestions_ranked`).  
If app code deploys before those functions are present in schema cache, homepage search can fail at runtime.

## Matching contract (FTS-first)

- **Hot path:** `search_articles_ranked` / `search_suggestions_ranked` match only on
  `search_vector @@ search_prefix_tsquery(q)` (prefix OR-of-tokens).
- **Trigram fallback only:** when FTS returns zero first-page / suggest rows (or the
  ranked RPC errors), the app calls `search_articles_trigram` /
  `search_suggestions_trigram`. Never blend `title %` into the FTS WHERE clause.
- Migration **041** restores this contract after **040** briefly OR-blended trigram
  into the hot path (which caused intermittent PostgREST statement timeouts → empty UI).

Apply 037→041 with `npm run db:apply-search-relevance` (idempotent).

## Required rollout order

1. Deploy DB migrations that create/alter required search RPCs.
2. Confirm schema cache reload in target environment.
3. Run RPC preflight checks from runtime credentials.
4. Deploy application code that depends on those RPCs.

Never invert this order for RPC-dependent changes.

## Required preflight checks

Minimum release gate for RPC-backed search:

- RPC exists and is callable:
  - `public.search_articles_ranked(...)`
  - `public.search_suggestions_ranked(...)`
  - `public.search_articles_trigram(...)`
  - `public.search_suggestions_trigram(...)`
- Suggest route smoke: `GET /api/search/suggest?q=david&stream=all` → `suggestions.length > 0`
- Nonsense query: `GET /api/search/suggest?q=xyzzyx&stream=all` → `suggestions: []` (200)
- Suggest route returns 200 with valid payload shape on success; **503** with
  `error: 'suggest_unavailable'` on hard upstream failure; **429** with
  `error: 'rate_limited'` when throttled.
- Committed search route returns 200 with valid payload shape.

## Runtime safety policy

When introducing a new search RPC dependency:

- Keep a temporary fallback in app query layer that preserves functional search when RPC is missing.
- Log fallback usage for visibility.
- Remove fallback only after at least one stable release cycle with near-zero fallback hits.
- Do not return HTTP 200 empty suggestions for upstream timeouts — use 503 so the client can retry and show an error message.

## Incident response: missing RPC in schema cache

If error resembles:

- `Could not find the function public.search_articles_ranked(...) in the schema cache`

Then:

1. Validate migration state in target DB.
2. Trigger/verify schema cache reload.
3. Confirm grants (`anon`/`authenticated`) for the RPC.
4. Keep fallback path active until the above are confirmed.
5. Re-run smoke checks for suggest + committed search + cursor pagination.

## Incident response: empty suggestions for known-good queries

1. Hit `GET /api/search/suggest?q=<known>&stream=all` and note status / `error` field.
2. Check Postgres logs for `canceling statement due to statement timeout` on suggest RPCs.
3. Confirm migration **041** is applied (`search_suggestions_ranked` body has no `title %`).
4. Confirm client retries (does not sticky-cache failed query keys).

## Ownership

- App query layer fallback + telemetry: web app team.
- Migration deployment + schema cache verification: DB/platform owner.
- Release preflight enforcement in CI/CD: release engineering.
