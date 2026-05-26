# Tag taxonomy — home filter surface

Official **format / domain / topic** tags shown to users in the home (and mobile) **Filters** sidebar under **“Format, domain & topics”**. This is separate from the **Collections** tab in the same panel.

**Out of scope here:** Community collections ([community-collections-catalog.md](./community-collections-catalog.md)), free-form tags on nuggets, admin-only tag lists.

## Snapshot metadata

| Field | Value |
|-------|--------|
| **Captured at** | 2026-05-26 (local dev API) |
| **Endpoint** | `GET /api/categories/taxonomy` |
| **API base** | `http://127.0.0.1:5000` |
| **UI component** | `src/components/header/FilterPanel.tsx` |
| **Hook** | `src/hooks/useTagTaxonomy.ts` |

Production labels and counts may differ; refresh by calling the taxonomy endpoint against the target environment.

## Where users see these tags

| Surface | Behavior |
|---------|----------|
| Desktop filters sidebar | Tab **Format, domain & topics** → sections **Content format**, **Subject domain**, **Topics** |
| Mobile filter sheet | Same three sections |
| Home category toolbar | Subset: format + domain tags only (when Phase B UI is active) |

Within each section, chips are sorted by **nugget usage (desc)**, then name. Only the first **6** chips show until **Show more** is expanded (`FACET_INITIAL = 6` in `FilterPanel.tsx`).

## How tags get on this surface

The API returns only MongoDB tags where:

- `status === 'active'`
- `dimension` is one of `format`, `domain`, `subtopic`

Implementation: `getTagTaxonomy` in `server/src/controllers/tagsController.ts`.

Filtering applies **exact tag IDs** on articles (`tagIds`). Alias strings on a tag record do **not** expand filter matches.

Canonical seed definition (may differ from live DB names): `server/src/scripts/seedDimensionTags.ts`.

---

## Note: why older names are not shown

Users sometimes expect separate filter chips for labels such as **Knowledge Byte**, **Report**, **Reports**, **Insights**, or **Blog / Article**. Those names are usually **not missing**; they were **consolidated or moved** out of this filter vocabulary.

### Controlled vocabulary, not “all tags”

The filter panel is a **small official taxonomy**, not every tag ever created. Tags without a `dimension` field (legacy / free-form) stay in the database but **never appear** in `GET /api/categories/taxonomy`, even if `status` is `active`.

### What happened to common legacy names

| Legacy or informal name | Typical fate | Shown as filter chip? |
|-------------------------|--------------|------------------------|
| **Knowledge Byte** (singular) | Alias on **Knowledge Bytes** | No — use **Knowledge Bytes** |
| **Report**, **Reports**, **Insights** | Aliases of format tag in seed (`Report / Insights`); live DB uses **Report, Blogs & Insights** | No — use the canonical format chip |
| **Blog / Article**, **Blogs & Article** | Old **collection** names; ETL maps to format **Report / Insights** (`server/src/controllers/adminTaggingController.ts` `COLLECTION_TO_TAG_MAP`) | No — see **Collections** tab (e.g. “VC Reports and Blogs”) |
| **Podcast** vs “Lenny's Podcast”, etc. | Only **Podcast** is an official `format` dimension tag | No for show-specific free-form tags |
| **Gold** (domain) vs **Gold & Silver** (topic) | Both can exist as dimension tags; seed intended **Gold & Silver** as subtopic | Depends on DB assignment |

### Where legacy names may still appear

- **Collections** tab in the same filter panel (curated sets, not taxonomy axes).
- **Nugget cards** or legacy `tags` / stale `tagIds` if content was not fully retagged.
- **Create/edit tag picker** and **admin tag manager** (broader tag lists).

### Product intent

The three-axis model (**format** + **domain** + **subtopic**) replaces many overlapping collection and free-form labels with one canonical chip per axis value. New nuggets are expected to carry at least one **format** dimension tag (`validateDimensionTagIds` on create/update).

---

## Totals (this snapshot)

| Dimension | UI section | Count |
|-----------|------------|------:|
| `format` | Content format | 4 |
| `domain` | Subject domain | 9 |
| `subtopic` | Topics | 24 |
| **Total filter chips** | | **37** |

---

## Content format (`dimension: format`)

Sorted by `sortOrder` (admin order). Usage = articles referencing this tag ID.

| Label (`rawName`) | Tag ID | `sortOrder` | Nuggets |
|-------------------|--------|------------:|--------:|
| Podcast | `695edb1188f8a921c8d785c9` | 0 | 872 |
| Report, Blogs & Insights | `69ce4b2340f5da692a439cb5` | 1 | 1,061 |
| Knowledge Bytes | `69ce4b2340f5da692a439cbd` | 3 | 171 |
| Documentary | `6994aec84ed9f0baab8f9407` | 4 | 11 |

**Aliases on record (not separate filter chips):**

| Canonical tag | Aliases |
|---------------|---------|
| Knowledge Bytes | Knowledge Byte, KB |
| Documentary | Documentary & Short Films, Documentaries |
| Report, Blogs & Insights | *(none in DB at snapshot time)* |

**Seed vs live:** Seed script uses `Report / Insights` with aliases `Report`, `Reports`, `Insights`. Live DB renamed the format chip to **Report, Blogs & Insights** without those aliases attached yet.

---

## Subject domain (`dimension: domain`)

| Label (`rawName`) | Tag ID | `sortOrder` | Nuggets |
|-------------------|--------|------------:|--------:|
| Markets & Investments | `69ce4b2440f5da692a439cc0` | 0 | 1,107 |
| Technology | `699ddd24cb3c53b7304f6c6b` | 1 | 640 |
| Macro / Economics | `69ccc4ba04b60a256a939036` | 2 | 634 |
| Geopolitics | `693f9d4617cb618daa832c97` | 3 | 520 |
| History | `695c2f374e3f7abd02c54f1a` | 4 | 162 |
| Self-Development | `69ccc4ba04b60a256a939041` | 5 | 103 |
| Leaders, Investors & Entrepreneurs | `69ce4b2440f5da692a439ccd` | 6 | 132 |
| Gold | `694b8f20c769902632558526` | 7 | 61 |
| Others | `69d7fda18f1526df393b8edf` | 8 | 27 |

**Seed vs live:** Seed lists 7 domains (no **Gold** or **Others** as top-level domains). **Gold** in seed is an alias under subtopic **Gold & Silver**.

---

## Topics (`dimension: subtopic`)

| Label (`rawName`) | Tag ID | `sortOrder` | Nuggets |
|-------------------|--------|------------:|--------:|
| US | `6960b6dc88f8a921c8d797f0` | 1 | 232 |
| India | `69540b7a79e950fefda0c49f` | 2 | 195 |
| China | `695be6eaa95a590aea306c49` | 3 | 130 |
| Japan | `696119f088f8a921c8d79fbc` | 4 | 38 |
| Korea | `6996f3cbe293a9b11977b661` | 5 | 4 |
| Europe | `695fbf1788f8a921c8d78d1e` | 6 | 58 |
| Emerging Markets | `6960f6bc88f8a921c8d79c6b` | 7 | 13 |
| LatAm | `69642b5d2c1bf5f31c3ccb54` | 8 | 8 |
| US / West | `69ce4b2440f5da692a439ce3` | 9 | 184 |
| Middle East | `69636de0286031cbb7276376` | 10 | 103 |
| Russia | `696bf04180bac92b6c609c84` | 11 | 11 |
| Equity | `6950cbb43d9175611b6a4177` | 12 | 313 |
| Gold & Silver | `69ce4b2440f5da692a439cec` | 13 | 97 |
| Private Credit | `696b6c2c272c4c989fcda037` | 14 | 58 |
| Alternatives | `6961446188f8a921c8d7a1a4` | 15 | 47 |
| Currencies & FX | `69ce4b2440f5da692a439cf3` | 16 | 74 |
| Fixed Income | `695e5b2988f8a921c8d78222` | 17 | 89 |
| AI | `694ee22f42d086e15e05593b` | 18 | 506 |
| Semiconductors | `6978fd40bb8f7c1df3129489` | 19 | 71 |
| PE/VC | `6950cf023d9175611b6a418d` | 20 | 592 |
| Monetary Policy | `69946fe34ed9f0baab8f8fd0` | 21 | 151 |
| Commodities | `694b8f1ac769902632558523` | 22 | 184 |
| Crude Oil & Energy | `69ccc4ba04b60a256a93903e` | 23 | 167 |
| Southeast Asia | `69d945ea734d61fba13ccd8a` | 24 | 9 |

**Seed vs live:** Seed uses **LATAM**; live DB shows **LatAm**. Live adds **Southeast Asia** (not in seed file at time of writing).

---

## Refreshing this document

With the API running:

```bash
curl -s http://127.0.0.1:5000/api/categories/taxonomy
```

Update the tables and **Captured at** date from the JSON response. Optional: add `npm run export:tag-taxonomy-filter-surface` mirroring `export:community-collections-catalog` if automated snapshots are needed.

## Related code

| Area | Path |
|------|------|
| Taxonomy API | `server/src/routes/tags.ts`, `tagsController.getTagTaxonomy` |
| Seed / migration | `server/src/scripts/seedDimensionTags.ts` |
| Collection → tag mapping | `server/src/controllers/adminTaggingController.ts` |
| Filter UI | `src/components/header/FilterPanel.tsx`, `MobileFilterSheet.tsx` |
| Filter state / URL | `src/hooks/useFilterState.ts`, `filterTypes.ts` |
