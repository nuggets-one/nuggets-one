# Search Index Evaluation

This checklist captures the Phase 3 evaluation path for search index and vector changes without regressing Core Web Vitals.

Operational rollout/incident handling is documented in `docs/SEARCH_RELIABILITY_RUNBOOK.md`.

## Current baseline

- Committed search and suggestions are ranked through DB functions:
  - `public.search_articles_ranked(...)`
  - `public.search_suggestions_ranked(...)`
- Search pagination uses rank-aware cursor fallback (`rank`, `published_at`, `id`).

## Benchmark command

Run with project env vars loaded (`SUPABASE_URL`, `SUPABASE_ANON_KEY`):

```bash
npm run benchmark:search
```

Optional tuning variables:

- `SEARCH_BENCH_STREAM=standard|pulse`
- `SEARCH_BENCH_ITERATIONS=5`
- `SEARCH_BENCH_QUERIES="ai,interest rates,chip design"`

Output is written to:

- `scripts/benchmark-output/search-rpc-benchmark.<timestamp>.json`

## Evaluation gates before schema/index changes

1. Baseline ranked search latency (avg / p95) from benchmark output.
2. Candidate schema/index change in a dedicated migration branch:
   - Example candidates:
     - include `card_preview` in `search_vector`
     - rebalance title/excerpt/body weights
     - `pg_trgm` on `articles.title` for typo fallback
3. Re-run the same benchmark queries and compare:
   - search avg latency
   - suggest avg latency
   - result quality deltas for representative queries
4. Keep only changes that improve relevance while staying within route budgets and no-search regression.

## Deployment readiness (RPC-backed search)

Use this checklist before merging or releasing RPC-backed search changes.

1. **Migrations first**
   - Apply all search RPC migrations to target env before app rollout.
   - Required functions:
     - `public.search_articles_ranked(...)`
     - `public.search_suggestions_ranked(...)`
2. **Schema cache refresh**
   - Confirm PostgREST schema cache is reloaded after migration.
   - Verify RPC calls succeed from app runtime credentials (`anon` path).
3. **Runtime compatibility**
   - Keep app fallback paths enabled until one stable release cycle passes with zero missing-RPC errors.
   - Fallback should preserve functional search, even if ranking quality is reduced.
4. **Release guard**
   - Run an RPC preflight check in CI/CD before promoting build artifacts.
   - Fail release if required RPC functions are missing or non-callable.
5. **Post-deploy checks**
   - Smoke test:
     - suggest endpoint
     - committed search endpoint
     - search pagination cursor flow
   - Track fallback hit rate; target near-zero before removing fallback code.
