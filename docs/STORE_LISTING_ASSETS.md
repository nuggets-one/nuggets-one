# Store Listing Assets

Play Store and marketing assets for **Nuggets** (`nuggets.one`). Brand tokens and icon specs: [BRAND_ASSET_HANDOFF.md](./BRAND_ASSET_HANDOFF.md).

## Generated assets (repo)

| File | Dimensions | Purpose |
|------|------------|---------|
| `public/store/play-feature-graphic.svg` | 1024×500 | Editable Play Store banner source |
| `public/store/play-feature-graphic.png` | 1024×500 | Upload to Google Play Console → Store listing → Feature graphic |
| `public/icons/icon-512.png` | 512×512 | Play Console → High-res icon (reuse PWA icon) |

Regenerate PNGs after editing SVGs:

```bash
npm run icons:generate
```

## Phone screenshots (capture manually)

Google Play requires **at least 2** phone screenshots. Recommended: **4–8** at **1080×1920** (9:16) or native device resolution.

Save exports under `docs/store-listing/screenshots/phone/` (gitignored if large — commit only when ready for launch).

### Recommended shots

1. **Home feed** — default stream, 2–3 cards visible, light theme
2. **Home feed (dark)** — same view, dark theme toggled
3. **Article detail** — title, hero, body excerpt, bookmark visible
4. **Search** — query typed or suggestions open
5. **Bookmarks** — saved nuggets grid (authenticated)
6. **Collections** — library browse (if populated)
7. **Stream / filters** — chip rail with an active tag filter
8. **Notifications** — bell panel open (optional, authenticated)

### Capture tips

- Use Android emulator **Pixel 7** (1080×2400) or physical device; crop to 9:16 if needed
- Hide debug overlays, use production or staging with real content
- Status bar: full (not cropped) — Play accepts standard device chrome
- No personal data in screenshots unless consented test accounts

## Optional tablet screenshots

| Type | Dimensions |
|------|------------|
| 7" tablet | 1200×1920 |
| 10" tablet | 1600×2560 |

Save under `docs/store-listing/screenshots/tablet-7/` and `tablet-10/`.

## iOS (if planned)

| Asset | Dimensions |
|-------|------------|
| App Store icon | 1024×1024 PNG, no alpha, square (Apple applies mask) |
| iPhone 6.7" screenshots | 1290×2796 |
| iPhone 6.5" screenshots | 1284×2778 |

## Social profiles (optional)

| Platform | Asset | Dimensions |
|----------|-------|------------|
| Twitter/X | Profile | 400×400 |
| Twitter/X | Header | 1500×500 |
| LinkedIn | Logo | 300×300 |
| LinkedIn | Cover | 1128×191 |
| Link previews | OG default | 1200×630 (`public/og-default.png`) |

## Designer deliverables checklist

- [ ] `play-feature-graphic.svg` refined (copy, layout, optional device mockup)
- [ ] Phone screenshot set (min 2, recommend 4–8)
- [ ] Short description + full description copy for Play Console
- [ ] Optional tablet screenshots
- [ ] Optional iOS assets if App Store is in scope

## Play Console upload map

1. **Grow** → **Store presence** → **Main store listing**
2. **Feature graphic** → `public/store/play-feature-graphic.png`
3. **App icon** → `public/icons/icon-512.png`
4. **Phone screenshots** → files from `docs/store-listing/screenshots/phone/`
