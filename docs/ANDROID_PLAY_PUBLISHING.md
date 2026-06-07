# Android Play Store Publishing — Nuggets

Staged rollout guide: **Internal testing → Closed testing → Production**.

| Phase | Doc section | Who |
|-------|-------------|-----|
| Internal testing | [ANDROID_INTERNAL_TESTING.md](./ANDROID_INTERNAL_TESTING.md) | Engineers + core testers |
| Store listing + compliance | [STORE_LISTING_ASSETS.md](./STORE_LISTING_ASSETS.md), [STORE_LISTING_COPY.md](./STORE_LISTING_COPY.md), [PLAY_CONSOLE_COMPLIANCE.md](./PLAY_CONSOLE_COMPLIANCE.md) | Founder / PM |
| Closed testing (beta) | Below | Founder + beta group |
| Production | Below | Founder |

---

## Architecture reminder

Nuggets Android is a **Capacitor shell** loading `https://www.nuggets.one`. Two update paths:

| Layer | Delivery |
|-------|----------|
| Website + API | **Vercel deploy** — force-close app to refresh |
| Native (push, permissions, icons, SDK) | **New `.aab` on Play** with higher `versionCode` |

Config: [`capacitor.config.ts`](../capacitor.config.ts) · Current version: [`android/app/build.gradle`](../android/app/build.gradle)

---

## Phase 0 — Prerequisites (one-time)

- [ ] Google Play Developer account ($25) + identity verified
- [ ] Upload keystore in gitignored `android/keystore.properties` ([example](../android/keystore.properties.example)) — **back up securely**
- [ ] Play App Signing enabled in Console
- [ ] `android/app/google-services.json` present; `FCM_SERVICE_ACCOUNT_JSON` on Vercel
- [ ] `GET https://www.nuggets.one/api/health/push` → `configured: true`
- [ ] Web production ready per [CUTOVER_RUNBOOK.md](./CUTOVER_RUNBOOK.md)

### Build signed AAB (every native release)

```powershell
$env:CAPACITOR_SERVER_URL='https://www.nuggets.one'
npm run android:preflight
npm run android:bundle
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

Before upload: increment `versionCode` and bump `versionName` in `android/app/build.gradle`.

---

## Phase 1 — Internal testing

See [ANDROID_INTERNAL_TESTING.md](./ANDROID_INTERNAL_TESTING.md).

**Exit criteria before Closed testing:**

- [ ] Install/update from Play on 2+ physical devices
- [ ] Google sign-in works in WebView
- [ ] Push permission + test notification (Play build, not USB debug)
- [ ] Article navigation stable (cold start, background resume)

---

## Phase 2 — Store listing and compliance

Complete while Internal testing runs.

### Store assets

| Asset | Path |
|-------|------|
| App icon 512×512 | `public/icons/icon-512.png` |
| Feature graphic | `public/store/play-feature-graphic.png` |
| Phone screenshots | `docs/store-listing/screenshots/phone/*.png` |

Generate screenshots:

```powershell
$env:PLAYWRIGHT_BASE_URL='https://www.nuggets.one'
npm run store:screenshots
```

Copy: [STORE_LISTING_COPY.md](./STORE_LISTING_COPY.md)

### Play Console compliance

Work through [PLAY_CONSOLE_COMPLIANCE.md](./PLAY_CONSOLE_COMPLIANCE.md):

- [ ] Data safety form
- [ ] Content rating (IARC)
- [ ] Target audience
- [ ] App access instructions (reviewer test Gmail)
- [ ] Privacy policy URL

**Production is blocked until policy tasks are green.**

---

## Phase 3 — Closed testing (beta)

**Checklist:** [ANDROID_CLOSED_TESTING_CHECKLIST.md](./ANDROID_CLOSED_TESTING_CHECKLIST.md)

**Goal:** 20–100 testers, 1–2 week soak before public launch.

### Setup

1. Play Console → **Test and release → Testing → Closed testing**
2. Create track (e.g. **Beta**)
3. **Create new release** → upload `app-release.aab` (same or newer than Internal)
4. Release notes (user-facing) — template in [STORE_LISTING_COPY.md](./STORE_LISTING_COPY.md)
5. **Review release → Start rollout to Closed testing**

### Testers

- **Testers** tab → create email list or link Google Group
- Share **Copy link** opt-in URL (different from Internal link)
- Testers must use the **same Google account** on device as on the list

### Beta tester email (template)

```
Subject: Nuggets Android beta — you're invited

You've been invited to test Nuggets on Android before public launch.

1. Open this link on your phone (signed into your Google account):
   [PASTE CLOSED TESTING OPT-IN URL]

2. Accept the invite and install from Google Play Store.

3. Sign in with Google to try bookmarks and notifications.

4. Allow notifications when Android prompts you.

5. Reply with feedback: crashes, slow loads, sign-in issues, or missing updates.

You do not need a new link for future beta versions — update via Play Store → Updates.
```

### Monitor during soak

| Signal | Where |
|--------|-------|
| Crashes / ANRs | Play Console → Quality → Android vitals |
| Push delivery | `GET /api/health/push`, [NOTIFICATIONS_SLA.md](./NOTIFICATIONS_SLA.md) |
| Web regressions | Vercel logs; no Play upload needed for UI-only fixes |

### Exit criteria

- [ ] No P0 bugs (crash loop, blank WebView, auth broken)
- [ ] Push acceptable on Play-installed builds
- [ ] Store listing + compliance complete
- [ ] Minimum 1 week soak with active tester feedback

### Optional: Open testing

After Closed, promote to **Open testing** for unlimited testers before Production. Same AAB can be promoted if unchanged.

---

## Phase 4 — Production release

**Checklist:** [ANDROID_PRODUCTION_ROLLOUT_CHECKLIST.md](./ANDROID_PRODUCTION_ROLLOUT_CHECKLIST.md)

### Submit

1. Play Console → **Test and release → Production**
2. **Create new release** → upload AAB **or Promote release** from Closed testing (if identical build)
3. **Staged rollout:** start **10%** (recommended first launch)
4. **Review release → Start rollout to Production**
5. Wait for review — often hours to 3 days (new accounts may take longer)

### Staged rollout ramp

| Day | Action |
|-----|--------|
| 0 | 10% rollout — monitor vitals |
| 2–3 | Increase to 50% if no crash spike |
| 5–7 | 100% if stable |

Console → Production → **Release dashboard → Manage rollout**

### Post-launch

- [ ] Respond to Play Store reviews
- [ ] Monitor Android vitals (crash rate, ANR rate)
- [ ] Monitor `GET https://www.nuggets.one/api/health/push`
- [ ] Announce on site/social when 100% live

---

## Ongoing releases

### Web-only change (no Play upload)

1. Deploy Vercel production
2. Users force-close and reopen app

### Native change (Play upload required)

1. `npm run android:preflight`
2. Bump `versionCode` + `versionName`
3. `npm run android:bundle`
4. Upload to appropriate track (Internal first for risky native changes)
5. Promote through tracks or release to Production

---

## Version history

| versionCode | versionName | Notes |
|-------------|-------------|-------|
| 1 | 1.0 | First internal upload |
| 2 | 1.1 | Push: Firebase + Capacitor + POST_NOTIFICATIONS |
| 3 | 1.2 | (fill on upload) |
| 4 | 1.3 | Current in `build.gradle` |

Update this table on each Play upload.

---

## Related docs

- [ANDROID_INTERNAL_TESTING.md](./ANDROID_INTERNAL_TESTING.md) — internal track + push decision tree
- [ANDROID_TESTER_CHECKLIST.md](./ANDROID_TESTER_CHECKLIST.md) — tester-facing update steps
- [PUSH_NOTIFICATIONS_ARCHITECTURE.md](./PUSH_NOTIFICATIONS_ARCHITECTURE.md) — FCM pipeline
