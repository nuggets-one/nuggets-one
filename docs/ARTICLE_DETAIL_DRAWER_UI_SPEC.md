# Nugget detail sheet (intercepted route) — UI specification for recreation

> Status: Canonical
>
> Implement From: `docs/ARTICLE_DETAIL_DRAWER_UI_SPEC.md`
>
> Last Validated In PR: pending
>
> Legacy Reference: `docs/article-detail-drawer-ui-spec old website.md` (non-implementable)
>
> Component Owners: `components/ui/sheet.tsx`, `components/ui/article-content.tsx`, `components/ui/nugget-open-full-page-button.tsx` (sheet escape), `components/ui/article-body.tsx`, `components/ui/article-detail-header.tsx` (sheet), `components/ui/article-detail-inline-actions.tsx` (full page), `components/ui/article-detail-youtube-hero.tsx`, `components/ui/timestamp-link-interceptor.tsx`, `components/ui/youtube-jump-to-hero.tsx`, `components/ui/markdown-page-toc.tsx`, `components/layout/global-youtube-mini-player-host.tsx` / `components/ui/global-youtube-mini-player.tsx`

This document describes the **intercepted-route nugget detail sheet**: the parallel slot `app/(main)/@modal/(.)nuggets/[id]/[slug]/page.tsx` renders `<Sheet><ArticleContent /></Sheet>`. The same `ArticleContent` appears on the full-page route `/nuggets/[id]/[slug]`; only the **outer shell** differs (sheet vs page). Treat the canonical route as the product concept and the shell as the context-specific presentation.

**Source files (in render order):**

- `components/ui/sheet.tsx` — drawer chrome, backdrop, close bar, responsive behavior  
- `components/ui/article-content.tsx` — article layout, hero, footer; **full-page** wide shell, optional TOC grid (`!inSheet`); sheet stays compact  
- `components/ui/article-body.tsx` — markdown / prose body; optional heading `id`s for TOC anchors  
- `components/ui/markdown-page-toc.tsx` — sticky / mobile “On this page” nav (full-page nuggets with headings)  
- `components/ui/article-detail-youtube-hero.tsx` — YouTube hero poster → deferred **global** mini-player  
- `components/ui/article-detail-header.tsx` — **sheet only:** sticky brand row + share/bookmark/more + close  
- `components/ui/article-detail-inline-actions.tsx` — **full page only:** share/bookmark/more on the date meta row (no duplicate site chrome)  
- `components/ui/timestamp-link-interceptor.tsx` — `#yt=` body link delegation → global mini-player
- `components/ui/youtube-jump-to-hero.tsx` — FAB when hero scrolls off-screen during playback  
- `components/ui/bookmark-button.tsx`, `components/ui/share-button.tsx` — footer actions (`variant="detail"`)  
- `components/ui/article-detail-skeleton.tsx` — loading placeholder inside Suspense  
- `app/globals.css` — CSS variables for colors  
- `tailwind.config.js` — font, color token wiring, `@tailwindcss/typography`  
- `app/layout.tsx` — root `<html>/<body>` typography wiring and global system font setup

---

## 0. Governance and ownership

### 0.1 Single-source policy

- This file is the **only implementation source** for Article Detail UI behavior.
- The legacy file (`docs/article-detail-drawer-ui-spec old website.md`) is reference-only and must not be used for direct implementation.
- If this file and code diverge, update this file in the same PR that changes behavior.

### 0.2 UI zone ownership matrix

| UI zone | Owner file | Rule |
|---|---|---|
| Sheet overlay, backdrop, panel motion, close mechanics, focus trap | `components/ui/sheet.tsx` | May not render article content zones. |
| Top article controls (inside article surface) | `components/ui/article-detail-header.tsx` | **Sheet only** — brand row + share/bookmark/more/close. Full-page detail has **no** duplicate toolbar; actions live on the meta row via `article-detail-inline-actions.tsx`. |
| Tags/title/meta/source/media/body/disclaimer/footer rows | `components/ui/article-content.tsx` | Single owner for content hierarchy. |
| Full-page TOC rail + “On this page” | `components/ui/article-content.tsx` + `components/ui/markdown-page-toc.tsx` | TOC only when `!inSheet` and markdown has extractable headings; must not duplicate legal-only copy. |
| Markdown typography and element overrides | `components/ui/article-body.tsx` | Must not be duplicated elsewhere. |
| YouTube hero (poster → play) | `components/ui/article-detail-youtube-hero.tsx` + `components/ui/global-youtube-mini-player.tsx` | No in-flow iframe until user gesture; same deferred mini-player as the feed. |
| YouTube body timestamps + jump FAB | `timestamp-link-interceptor.tsx`, `youtube-jump-to-hero.tsx`, `lib/ui/youtube-hero-scroll.ts` | Hero anchor `#nugget-youtube-hero`; scroll root `#nugget-doc-body` when TOC or YouTube hero. |

### 0.3 No-duplication invariant

- A zone can render in **one owner only**.
- Forbidden examples:
  - Save/Share rendered in both `sheet.tsx` and `article-content.tsx`.
  - Source link rendered in both header and footer.
  - Brand row rendered at both top and bottom.

## 1. Global typography and font

| Token | Value |
|--------|--------|
| **Font family** | System UI stack via `font-sans` on `<body>`, using Tailwind's default sans stack (`system-ui`, `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, sans-serif). |
| **Body default** | `antialiased` on `<body>`. Inherited `text-primary` (see colors). |
| **Numeric / date** | Article date uses `Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })` — e.g. “January 15, 2025”. |

No custom letter-spacing on body; headings in markdown use Tailwind Typography defaults with overrides listed in §6.

---

## 2. Color system (semantic tokens)

All semantic colors are **CSS variables** in `:root` and `.dark` in `app/globals.css`, exposed to Tailwind as `bg-*`, `text-*`, `border-*`, etc.

### 2.1 Light theme (`:root`)

| Role | CSS variable | Typical resolution |
|------|----------------|-------------------|
| Page background | `--color-bg` | `zinc.50` |
| Page surface (white areas) | `--color-bg-page` | `#ffffff` |
| Card / sheet surface | `--color-surface` | `#ffffff` |
| Raised surface | `--color-surface-raised` | `zinc.50` |
| Borders | `--color-border` | `zinc.200` |
| Primary text | `--color-text-primary` | `zinc.900` |
| Muted text | `--color-text-muted` | `zinc.500` |
| Brand accent | `--color-accent` | `#F5B800` |
| Accent hover | `--color-accent-hover` | `#D4A000` |
| Focus ring | `--color-focus-ring` | `#F5B800` |
| Pulse stream chip | `--color-pulse-chip-bg` | `amber.100` |
| Pulse stream chip text | `--color-pulse-chip-fg` | `amber.700` |

### 2.2 Dark theme (`.dark` on `<html>`)

| Role | Notes |
|------|--------|
| Surfaces | `--color-surface`: `zinc.900`; `--color-surface-raised`: `zinc.800`; `--color-bg` / `--color-bg-page`: `zinc.950` |
| Text | Primary `zinc.100`, muted `zinc.400` |
| Border | `zinc.800` |
| Pulse chip | Background `rgb(120 53 15 / 0.3)`, foreground `amber.400` |
| Accent | Same yellow `#F5B800` (hover `#E5AC00`) |

### 2.3 Tailwind class → token mapping (used in drawer)

- `bg-surface`, `bg-surface/95` (sticky bar), `bg-surface-raised`, `bg-bg` (not on sheet panel; body uses `bg-bg`)  
- `text-primary`, `text-muted`  
- `border-border`  
- `text-accent` (saved bookmark state)  
- `ring-accent` (close button focus), `ring-focus/60` (YouTube focus)  
- Pulse label: `bg-pulse-chip-bg text-pulse-chip-fg`  
- Non-pulse stream chip: `bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400`  
- Backdrop: `bg-black/50`  
- YouTube play overlay: `bg-black/20`, hover `bg-black/30`; play button `bg-black/65 text-white`, `ring-2 ring-white/80`  
- Footer “N” badge: `bg-accent text-black font-bold`  

---

## 3. Sheet (drawer) shell — structure and layout

**Role:** `role="dialog"`, `aria-modal="true"`, `aria-label="Article"` (overridable).

### 3.1 Root overlay container

- **Position:** `fixed inset-0 z-50`  
- **Flex:** `flex items-end justify-end` — mobile aligns sheet to bottom/end  
- **Desktop (`lg:`):** `lg:items-stretch` — full viewport height alignment  

### 3.2 Backdrop (full-screen close target)

- **Element:** `<button type="button" aria-label="Close">` covering full viewport  
- **Position:** `absolute inset-0`  
- **Appearance:** `bg-black/50`  
- **Motion:** `motion-safe:transition-opacity motion-safe:duration-200`  
- **Behavior:** Click → `router.back()`  

### 3.3 Panel (the “drawer” surface)

**Mobile (default, `< lg`):**

- **Size:** `h-[100dvh]`, `w-full` — full visible viewport (dynamic viewport height); `max-lg:pt-[env(safe-area-inset-top)]` and `max-lg:pb-[env(safe-area-inset-bottom)]` keep chrome clear of notch / home indicator.  
- **Shape:** `rounded-none` (full-bleed panel; drag pill remains the sheet affordance)  
- **Background:** `bg-surface`  
- **Text:** `text-primary`  
- **Shadow:** `shadow-2xl`  
- **Scroll:** `flex flex-col overflow-y-auto` on the panel  
- **Enter animation:** Initial `translate-y-full`; after mount (`data-mounted=true`) `translate-y-0`. Transition: `motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out`  
- **Swipe dismiss:** Touch drag down; if vertical offset &gt; **80px** on release → close. While dragging, panel gets inline `transform: translateY(dragOffsetpx)`  
- **`prefers-reduced-motion`:** `motion-reduce:!translate-y-0 motion-reduce:transition-none` — no slide  

**Desktop (`lg:` and up):**

- **Height:** `lg:h-full` (full viewport height)  
- **Width:** `lg:max-w-[640px]`  
- **Corners:** `lg:rounded-none lg:rounded-l-2xl` (only left side rounded)  
- **Enter animation:** `lg:translate-y-0 lg:translate-x-full` → `lg:data-[mounted=true]:translate-x-0` (slides in from the right)  
- **Reduced motion:** `lg:motion-reduce:!translate-x-0`  

**Inner structure:**

1. **Sticky header row** — `sticky top-0 z-10 flex items-center justify-end gap-1 border-b border-border bg-surface/95 px-3 py-2 backdrop-blur-sm`  
   - **Close control:** Circular icon button `inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-raised hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`  
   - **Icon:** SVG X, `h-5 w-5`, `stroke="currentColor"`, `strokeWidth={2}`, `strokeLinecap="round"`, `strokeLinejoin="round"` — paths `M6 6l12 12M18 6L6 18`  

2. **Content region** — `flex-1` wrapper around `{children}` (this is where `ArticleContent` mounts)

---

## 4. Article content — page structure inside the sheet

**Root:** `<article className="max-w-2xl mx-auto py-8 px-4">`  
- **Max width:** `42rem` (`max-w-2xl`) centered  
- **Vertical padding:** `py-8` (2rem top/bottom)  
- **Horizontal padding:** `px-4` (1rem)  

Sections below are **top to bottom**.

### 4.1 Meta row (stream chip, tag, date)

- **Container:** `flex flex-wrap items-center gap-2 mb-4 text-sm text-muted`  
- **Stream chip:** `rounded-full px-2.5 py-0.5 text-xs font-medium` + stream-specific colors (§2.3)  
  - Labels: **“Market Pulse”** if `content_stream === 'pulse'`, else **“Nuggets”**  
- **Primary tag (slug):** `text-xs text-muted` (only first tag slug)  
- **Date:** `ml-auto text-xs` (pushes to end of row when space allows)  

### 4.2 Title

- **Element:** `<h1>`  
- **Classes:** `text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-primary mb-4`  
  - Mobile: 1.5rem; `sm+`: 1.875rem  
  - Bottom margin: `1rem`  

### 4.3 Excerpt (optional)

- **Element:** `<p>`  
- **Classes:** `text-base text-muted leading-relaxed mb-6 border-l-2 border-border pl-4`  
  - Left accent: 2px border, `1rem` padding-left  
  - Bottom margin: `1.5rem`  

### 4.4 Hero media

**YouTube (`hero_media_kind === 'youtube'` + `hero_video_id`):**

- Wrapper: see §5 (`my-8` on outer container)  

**Image hero (else if `hero_thumb_url`):**

- **Container:** `relative aspect-video w-full rounded-xl overflow-hidden mb-8 bg-surface-raised`  
- **Image:** `fill`, `object-cover`, `sizes="(max-width: 672px) 100vw, 672px"`, `quality={80}`, `priority`  

### 4.5 Body

- Markdown: `<ArticleBody />` (§6)  
- Optional `<TimestampLinkInterceptor>` wrapper when YouTube hero is present  
- Body links `[label](#yt={seconds})` seek the **global mini-player**; hero scrolls into view on tap; `<YouTubeJumpToHero />` FAB when hero is off-screen  
- Legacy `(MM:SS)` in markdown is normalized server-side in `<ArticleBody />`  
- **Empty state:** `<p className="text-muted text-sm italic">No content available.</p>`  

### 4.6 Footer

- **Container:** `<footer className="mt-10 pt-6 border-t border-border flex flex-col gap-4">`  
  - Top margin `2.5rem`, top padding `1.5rem`, top border  

**Tag pills (all tags or fallback tag_slugs):**

- Row: `flex flex-wrap gap-2`  
- Each pill: `rounded-full px-3 py-1 text-xs font-medium bg-surface-raised text-muted border border-border`  

**Action row:**

- **Container:** `flex items-center gap-3 flex-wrap`  
- **BookmarkButton** / **ShareButton** with `variant="detail"` (§7)  
- **“View source ↗”** link (if `source_url`): `inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors`, opens new tab  

**Attribution row:**

- **Container:** `flex items-center gap-2 text-xs text-muted`  
- **Avatar letter:** `inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent text-black font-bold text-xs select-none` — character **“N”**  
- **Label:** plain `<span>Nuggets</span>`  

---

## 5. YouTube hero block (poster only)

**Owner:** `components/ui/article-detail-youtube-hero.tsx` — anchor id `#nugget-youtube-hero` on the wrapping `<section>` in `article-content.tsx`.

**Outer:** `relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-900` (sheet may wrap in `rounded-2xl bg-surface-raised`).

**Poster state (always — no in-flow iframe):**

- Full-area `<button>` dispatches `youtube-feed-play` → **`GlobalYouTubeMiniPlayer`** (fixed bottom portal, `z-[100]`).  
- Overlay: `pointer-events-none` play glyph on poster (`bg-media-control` circle).  
- Gradient title strip with YouTube brand mark at bottom of poster.

**Playback:** Deferred global mini-player only — same bus as feed cards. Hero never mounts an embed iframe (LCP stays the poster image).

**Body timestamps:** `[label](#yt=N)` → `TimestampLinkInterceptor` dispatches mini-player with `startSeconds`, then scrolls poster into view inside `[data-sheet-body]` when below the fold.

**External link below:** `mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted …` — text **“Watch on YouTube ↗”** (opens youtube.com in new tab).

---

## 6. Article body (markdown) — typography plugin

**Wrapper:**  
`className="prose prose-zinc dark:prose-invert max-w-prose mx-auto prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary prose-a:underline prose-a:underline-offset-2 prose-img:rounded-lg prose-img:my-6 prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:text-muted prose-code:bg-surface-raised prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-pre:bg-surface-raised prose-pre:rounded-xl prose-pre:border prose-pre:border-border"`

**LLM notes:**

- Uses **`@tailwindcss/typography`** (`prose` scale). Base body size follows the plugin’s default for `prose` (typically ~16px equivalent for `p`).  
- **Zinc palette** in light mode; **`dark:prose-invert`** in dark mode.  
- **Links:** primary text color, underlined, `underline-offset-2`.  
- **Headings:** semibold, tight tracking.  
- **Blockquote:** 4px left border `border-border`, padded left, muted text.  
- **Inline code:** raised surface background, rounded, horizontal/vertical padding, `text-sm`.  
- **Pre:** raised background, `rounded-xl`, border.  
- **Images in markdown:** Custom `BodyImage` — see below.

**Figures (BodyImage):**

- **Figure:** `my-6 w-full max-w-prose`  
- **Cloudinary images:** wrapper `relative w-full aspect-video overflow-hidden rounded-lg`, lazy `Image`  
- **Other URLs:** plain `<img className="w-full rounded-lg" loading="lazy" decoding="async">`  
- **Caption:** `mt-2 text-center text-xs text-muted`  

---

## 7. Bookmark and Share — `variant="detail"`

Shared patterns:

- `inline-flex items-center gap-1.5 transition-colors min-h-[44px] min-w-[44px] justify-center`  
- Icon SVG: `w-4 h-4` (bookmark), `h-4 w-4` (share), `strokeWidth={2}`  

**Detail-specific chrome:**

- `px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-surface-raised active:bg-surface-raised/80`  

**Bookmark:**

- Default: `text-muted hover:text-primary`; bookmarked: `text-accent`  
- Visible label: **“Save”** / **“Saved”** next to icon  
- Pending: `opacity-50 cursor-not-allowed`  

**Share:**

- Same bordered pill look  
- Label cycles: **“Share”** → **“Copied!”** / **“Copy failed”** (with `aria-live="polite"` on the span)  
- Failed state adds `text-muted` on the button class path  

---

## 8. Loading skeleton (`ArticleDetailSkeleton`)

Mirrors content width: `max-w-2xl mx-auto py-8 px-4 animate-pulse`, `aria-hidden="true"`.

| Block | Classes |
|--------|---------|
| Meta row | `flex gap-3 mb-4` — pill `h-5 w-24 rounded-full bg-surface-raised`, second `h-5 w-20 rounded bg-surface-raised` |
| Title lines | `h-8 w-full rounded bg-surface-raised mb-2`; second line `h-8 w-4/5 ... mb-6` |
| Hero | `aspect-video w-full rounded-xl bg-surface-raised mb-8` |
| Body lines | Eight rows `h-4 rounded bg-surface-raised mb-3`, width `w-full` except every 4th line `w-3/5` |

---

## 9. Motion and accessibility

| Behavior | Detail |
|----------|--------|
| Sheet enter | `requestAnimationFrame` then `mounted=true` so CSS transition runs from off-screen |
| Close | `Escape`, backdrop click, close button → `router.back()` |
| Focus | On mount, focus first focusable in sheet; on unmount restore previous focus |
| Focus trap | Tab cycles first ↔ last focusable inside sheet |
| Body scroll | `document.body.style.overflow = 'hidden'` while sheet mounted |
| Reduced motion | Global CSS in `globals.css` clamps animation/transition duration; sheet uses `motion-reduce` utilities |

---

## 10. Differences: full page vs drawer

| Aspect | Drawer (`Sheet`) | Full page (`/nuggets/[id]/[slug]/page.tsx`) |
|--------|------------------|-----------------------------------------------|
| Shell | Fixed overlay + mobile `100dvh` sheet / desktop ~640px panel + sticky close bar | No `Sheet`; article sits in normal document flow under site chrome |
| `ArticleContent` | Identical | Identical |

To recreate **only the drawer**, implement the **Sheet** (§3) and reuse the **ArticleContent** block (§4–§7) as the scrollable body.

---

## 11. Checklist for an LLM implementer

1. Wire the global **system UI stack** the same way as root layout (`font-sans` on `<body>`, no primary webfont).  
2. Implement **CSS variables** for light/dark as in `globals.css` (or equivalent).  
3. Build **Sheet**: backdrop 50% black, panel `surface` + `shadow-2xl`, responsive bottom vs right slide, **80px** swipe threshold on mobile.  
4. **Sticky** top bar with blur, bottom border, **36×36px** close hit target (Tailwind `h-9 w-9`), icon 20px.  
5. **Article**: `max-w-2xl`, `py-8 px-4`, then sections per §4.  
6. Install/configure **`@tailwindcss/typography`** and match **ArticleBody** utility string.  
7. Footer: **44px** min touch targets on bookmark/share, bordered pills, `mt-10 pt-6` separator.  
8. Match **YouTube** poster overlay and **rounded-xl** on video/image heroes.  

This spec is derived from the codebase as of the repo state when generated; if classes drift, prefer the cited files as source of truth.

---

## 12. Intentional deltas vs legacy reference

- Current v2 drawer uses `Sheet` + `ArticleContent` composition with explicit zone ownership.
- Legacy Project Phoenix had richer chrome and different compact typography defaults; v2 retains only intentional behavior and token choices documented here.
- Any reintroduction of legacy visual patterns must be explicitly listed as a new delta in this section.

---

## 13. Hierarchy contract (acceptance criteria)

Required order inside article content surface:

1. Top controls row (save/share + close behavior if specified by owner)
2. Tags row
3. Title
4. Meta row (read time/date/stream where applicable)
5. Source actions row (sheet): **Source** pill when `source_url` present (visible label **Source** only; hostname in `aria-label`) plus **View full page** button (hard-nav to canonical full-page shell; always shown in sheet)
6. Media block
7. Content body
8. Universal disclaimer
9. Footer (if used by current design contract)

Placement assertions:

- Source must appear in the declared top section, not duplicated at bottom.
- Sheet header **Source** pill must not show the hostname in visible copy (e.g. no `youtu.be`); use `aria-label` for host context.
- **View full page** is sheet-only, adjacent to Source in a `flex flex-wrap gap-2` row; uses `window.location.assign` on the canonical `/nuggets/[id]/[slug]` URL so the intercept slot clears and the full-page shell renders.
- Bottom brand row is allowed only if explicitly required by this contract revision.
- Save/Share may appear once only.

---

## 14. Typography token contract

These tokens are mandatory unless a future PR updates this table and screenshots:

| Zone | Required class token(s) | Notes |
|---|---|---|
| Tag chips | `text-[10px] font-medium` | Compact chip baseline |
| Meta row | `text-xs` | Secondary informational text |
| Title | `text-sm font-semibold` (compact) or explicitly versioned override | Must be versioned if changed |
| Body wrapper | `text-xs` compact mode **or** `prose` mode with declared size scale | One mode per contract version |
| Source label | `text-xs font-semibold` | Visible copy **Source** only; host in `aria-label` |
| View full page | `text-xs font-semibold` | Outlined pill beside Source; sheet only |
| Disclaimer | `text-[10px] italic` | Universal compliance copy |

PRs that change any token must:

- update this table,
- include before/after screenshots,
- update `Last Validated In PR` at file top.
