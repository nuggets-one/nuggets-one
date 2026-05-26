# Search Reliability Runbook

Operational runbook for RPC-backed homepage search, with rollout order and failure handling.

## Why this exists

Search can depend on DB RPC functions (`search_articles_ranked`, `search_suggestions_ranked`).  
If app code deploys before those functions are present in schema cache, homepage search can fail at runtime.

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
- Suggest route returns 200 with valid payload shape.
- Committed search route returns 200 with valid payload shape.

## Runtime safety policy

When introducing a new search RPC dependency:

- Keep a temporary fallback in app query layer that preserves functional search when RPC is missing.
- Log fallback usage for visibility.
- Remove fallback only after at least one stable release cycle with near-zero fallback hits.

## Incident response: missing RPC in schema cache

If error resembles:

- `Could not find the function public.search_articles_ranked(...) in the schema cache`

Then:

1. Validate migration state in target DB.
2. Trigger/verify schema cache reload.
3. Confirm grants (`anon`/`authenticated`) for the RPC.
4. Keep fallback path active until the above are confirmed.
5. Re-run smoke checks for suggest + committed search + cursor pagination.

## Ownership

- App query layer fallback + telemetry: web app team.
- Migration deployment + schema cache verification: DB/platform owner.
- Release preflight enforcement in CI/CD: release engineering.
