@AGENTS.md

# Nuggets v2 — Claude Code Rules

## Project
Greenfield Next.js 15 App Router + Supabase + Vercel + Tailwind replacing 
a legacy MongoDB/Express/Vite app (Project-Phoenix).

## Document precedence — consult in this order when in doubt
1. docs/NUGGETS_V2_MIGRATION_PLAN.md — Mongo→Postgres mapping, ETL
2. docs/NUGGETS_V2_BLUEPRINT.md — schema, RSC boundaries, caching
3. docs/NUGGETS_V2_PRODUCT_BEHAVIOR_AND_UI.md — user behavior, copy
4. docs/NUGGETS_V2_BUILD_EXECUTION.md — PR sequence, merge boundaries

## Current build position
PR-15 — ETL scripts: Mongo → Postgres (tags, articles, collections)
Update this line after each PR merges.

---

## ARCHITECTURE — enforce on every file

### Component default
Every page and data loader is a Server Component unless it needs:
- Browser APIs
- Local UI state
- Event handlers
Require explicit justification before adding 'use client'

### Data fetching
- Feed first page: server fetch, render as HTML
- Pagination: fetch + useTransition — never TanStack Query
- Bookmarks: one batched GET per feed page (24 IDs max) — not per card
- Never useEffect to fetch data a Server Component could handle

### URL state
- stream, tags, q live in URL via nuqs only
- NuqsAdapter mounts in app/(main)/layout.tsx ONLY
- Never mirror searchParams into useState or context via useEffect

### Supabase clients
- Browser: lib/supabase/client.ts
- Server: lib/supabase/server.ts  
- Admin (service role): lib/supabase/admin.ts — has import 'server-only'
- Never import adminClient outside a module with import 'server-only'

---

## SCHEMA — hard rules

### articles table
- status: 'draft' | 'published' ONLY
- NO is_published column — ever
- published_at: set once, frozen by DB trigger — never recompute
- slug: generated via scripts/shared/slug.ts — never npm slugify
- search_vector: GENERATED ALWAYS AS STORED — never a trigger
- tag_slugs: recomputed via SQL on tag change — never from memory

### Never add to articles
scheduled_for, approval_status, approved_by, access_tier, 
visibility, is_published, slug_version

---

## FORBIDDEN PACKAGES — never install
framer-motion, mongoose (in web app), express,
@tanstack/react-query, @tanstack/react-virtual,
react-router-dom, redux, zustand, jotai, recoil,
mobx, valtio, xstate, moment, date-fns, dayjs, luxon,
styled-components, @emotion/styled, react-youtube,
react-player, slugify (npm), bullmq, redis, web-push,
react-modal, react-spring, auto-animate, @vercel/og,
@sentry/react, @sentry/nextjs

---

## FORBIDDEN PATTERNS — never write

### Grid re-render traps
- Never put bookmark state in a context above the card list
- Filter/stream/tag changes must drive RSC via URL — never re-mount grid
- Bookmark toggle is local to each card only

### Legacy patterns from Project-Phoenix — do not port
- ArticleModal / ArticleDrawer → use /nuggets/[id]/[slug]
- FilterStateContext → use nuqs
- useInfiniteArticles hook → use fetch + useTransition
- BookmarkCollection / CollectionSelector → flat /bookmarks only
- openArticle / expanded URL sync → use next/link
- Modal-driven CRUD forms in admin → use route pages + Server Actions

### Other hard bans
- rehype-raw plugin (XSS)
- is_published in any .ts or .tsx file
- service role key outside lib/supabase/admin.ts
- <a href> for internal routes — use next/link
- TanStack Query on any read path including /bookmarks and collections
- useEffect chains syncing URL params into state

---

## COMPONENT RULES

### Cards
- ArticleCard: Server Component
- ArticleCardActions (bookmark/share): thin 'use client' island
- priority={true}: first card only (index === 0) — set server-side
- No react-markdown in card components

### Admin
- Auth gate: user.app_metadata.is_admin === true only
- Route-level pages: /admin/articles/new, /admin/articles/[id]
- No modal-driven forms — Server Actions + route pages only
- react-hook-form: allowed in app/admin/** only

### Empty/error states
- Single <StatusBlock> component for all surfaces
- Never freestyle per-surface empty state layouts

---

## PERFORMANCE BUDGETS
- Home route JS: ~85 KiB gzip max
- Detail route JS: ~60 KiB gzip max
- First paint: ~256 KiB Home / ~192 KiB detail
- LCP: ≤ 2.5s mobile | CLS: ≤ 0.1
- Skeletons required — never blank white, never spinner-only

---

## DEFERRED — do not implement
- In-product draft preview
- scheduled_for / approval workflow
- Push notifications / PWA / service worker
- Sentry
- @vercel/og dynamic OG
- Public user profiles / avatar upload / account deletion
- Custom scroll restoration
- Virtualization
- AI/GenAI SDK in web app
- Collections admin UI
- Multiple videos per nugget