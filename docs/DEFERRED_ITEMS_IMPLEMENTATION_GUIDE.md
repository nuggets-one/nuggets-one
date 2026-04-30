# Deferred Items Implementation Guide

This document captures the deferred items from the audit resolution and provides implementation guidance for the next execution pass.

## Scope

Deferred items covered here:

1. Public header/layout cache refactor (`S1-F3` + `S4-F3`)
2. Transactional tag source-of-truth enforcement (`S6-F4`)
3. Full `/account` PMF route (`S7-F1`)

Out of scope for this document:

- Already implemented hand-off items (`S6-F3`, `S8-F1`, `S2-F1/S2-F7`, `S2-F3`, `S6-F10`)
- Any schema redesign beyond what blueprint/migration docs already freeze

---

## 1) Header/Layout Cache Refactor (`S1-F3` + `S4-F3`)

### Problem

`(main)` header/layout reads auth/session and notification count server-side, which forces dynamic rendering and defeats canonical first-page cache assumptions.

### Decision

Keep the blueprint cache posture. Remove auth/session/notification reads from the public server layout path.

### Invariants

- Public server layout must remain cookie/session read free.
- Anonymous users do not see bell UI.
- Notification fetch must not block `/` first-byte path.
- Cache ownership stays in feed data layer (not arbitrary route-level `revalidate` narratives).

### Implementation Guidance

1. Make `components/layout/header.tsx` deterministic server chrome only.
2. Move auth-aware right-side controls to a thin client island.
3. Lazy-load notification panel from client side on authenticated sessions.
4. Ensure notification unread count is client-fetched/polled via existing API path.
5. Remove or correct misleading cache flags where they are currently inert.

### Blast Radius

- `components/layout/header.tsx`
- auth/bell UI components
- potential feed/page cache annotations
- notification loading path

### Verification

- Anonymous `/` render has no session-dependent server query.
- Authenticated UI still shows account + bell post-hydration.
- No regression in header behavior (desktop/mobile).
- Feed cache invalidation behavior is coherent with implemented mechanism.

---

## 2) Transactional Tag Source-of-Truth (`S6-F4`)

### Problem

Admin save writes `articles.tag_slugs` directly without maintaining `article_tags` as source of truth.

### Decision

`article_tags` is canonical. `articles.tag_slugs` is derived and must be recomputed from join table in the same write transaction.

### Invariants

- Never trust free-text `tag_slugs` as canonical.
- All tag writes must resolve to `tags.id` and update join rows.
- Derived `tag_slugs` must always match current join set.
- Detail page tag labels should come from join-backed truth.

### Implementation Guidance

1. Parse incoming slug list.
2. Resolve slugs against `tags` table; reject unknown tags (or return deterministic admin error code).
3. Perform atomic write:
   - update article base fields
   - replace `article_tags` rows for that article
   - recompute `articles.tag_slugs` from `article_tags JOIN tags`
4. Prefer DB-side RPC/SQL function for transaction safety and simpler server action code.
5. Keep ETL/admin behavior aligned with same derivation logic.

### Blast Radius

- `lib/actions/admin.ts`
- potential new SQL function / migration
- admin form error handling
- detail/tag query correctness

### Verification

- Create/edit article with tags updates `article_tags` and `articles.tag_slugs` consistently.
- Removing all tags clears both canonical and derived state.
- Detail page tag labels render correctly for admin-created rows.

---

## 3) Full `/account` PMF Route (`S7-F1`)

### Problem

Proxy matcher includes `/account`, and password reset redirects there, but route is missing.

### Decision

Implement `/account` PMF route (do not remove matcher).

### Invariants

- Route is auth-gated.
- PMF includes:
  - read-only email display
  - `profiles.display_name` edit
  - change-password flow entry
  - notification preference toggles
- No PMF scope creep:
  - no avatar upload
  - no account deletion
  - no social profile editing

### Implementation Guidance

1. Add `app/account/page.tsx` (server component shell).
2. Add/update server actions for:
   - profile display name update
   - notification preference updates (lazy-create semantics preserved)
3. Keep reset callback `next=/account` behavior and validate end-to-end flow.
4. Reuse existing style/state patterns (no bespoke architecture).

### Blast Radius

- `app/account/page.tsx` (new)
- auth/profile actions
- notifications preferences actions (if shared)
- middleware/proxy expectations

### Verification

- Logged-out user hitting `/account` is redirected to login and returns after auth.
- Password reset callback lands on working `/account`.
- Display name persists correctly in `profiles`.
- Preference toggles persist and respect defaults/lazy-create behavior.

---

## Recommended Rollout Order for Deferred Work

1. `/account` route (`S7-F1`) — unblocks reset UX and explicit route parity.
2. Transactional tag source-of-truth (`S6-F4`) — protects data integrity.
3. Header/layout cache refactor (`S1-F3` + `S4-F3`) — highest cross-cutting surface, do last with focused QA.

---

## Handoff Notes for Next Coding Agent

- Do not change already completed hand-off items unless fixing regressions.
- Keep edits narrow and audit-ID-commented where logic changes are non-obvious.
- Avoid introducing new packages.
- Preserve blueprint frozen behaviors for notifications, feed/cache posture, and source-of-truth ownership.
