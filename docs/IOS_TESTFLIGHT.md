# iOS TestFlight — hosted Capacitor shell

Engineer guide for Nuggets iOS (Capacitor + Codemagic). Non-engineers: see [Do testers get updates automatically?](#do-testers-get-updates-automatically).

**Related:** [PUSH_NOTIFICATIONS_ARCHITECTURE.md](./PUSH_NOTIFICATIONS_ARCHITECTURE.md) · [STORE_LISTING_ASSETS.md](./STORE_LISTING_ASSETS.md) · [ANDROID_INTERNAL_TESTING.md](./ANDROID_INTERNAL_TESTING.md) (same two-layer update model)

---

## Architecture

Nuggets iOS mirrors Android: a **Capacitor shell** loads the hosted site (`CAPACITOR_SERVER_URL`, production `https://www.nuggets.one`). The `mobile-web/` folder is a placeholder only — see [README.md](../README.md).

Native code in this repo (once `ios/` exists):

- WKWebView → `https://www.nuggets.one`
- `@capacitor/push-notifications` → FCM token with `platform: 'ios'`
- `GoogleService-Info.plist` (not committed — copy via `npm run setup:ios-push`)

Web-side push registration: `components/push/native-push-registration.tsx` (Android + iOS).

---

## Do testers get updates automatically?

**Partially.** Two update paths, same as Android:

| Layer | Examples | How testers get it |
|-------|----------|-------------------|
| **Website + server** | Feed UI, auth, push registration UI, topic sender, Supabase migrations | **Vercel production deploy** — force-close app and reopen (no TestFlight upload) |
| **Native iOS** | Capacitor plugins, `GoogleService-Info.plist`, push entitlements, `ios/` project changes | **New TestFlight build** — App Store app → Update |

---

---

## Apple Developer enrollment (India and some regions)

In **India** (and several other regions), Apple requires enrollment through the **Apple Developer app** on an **iPhone, iPad, or Mac** — not the web alone. The developer portal shows:

> *Enroll with the Apple Developer app. Open the Apple Developer app on your iPhone, iPad, or Mac…*

| Option | What you need |
|--------|----------------|
| **Apple Developer app** (typical in India) | Borrow/use an iPhone or iPad for ~30 min enrollment + $99 payment |
| **Contact Apple** | Link on enrollment page if you cannot use the app — may allow alternate path |
| **Mac enrollment** | Same Apple Developer app on Mac if you get Mac access later |

**You do not need to own the device permanently** — a friend’s iPhone for enrollment and later TestFlight install is enough.

After enrollment, APNs keys and App Store Connect are available in the **browser** on Windows.

---

## Before Apple Developer (no Apple device yet)

You can finish repo and Firebase prep **without** Apple Developer or Apple hardware.

| Task | Needs Apple **device**? | Needs Apple **Developer ($99)**? |
|------|-------------------------|----------------------------------|
| Stash `GoogleService-Info.plist` | No | No |
| Deploy Vercel web prep | No | No |
| Sign up Codemagic (connect repo) | No | No |
| **Enroll Apple Developer (India)** | **Yes** — iPhone/iPad/Mac + app | Yes ($99) |
| Create APNs Auth Key (.p8) | No (browser after enrollment) | Yes |
| Bootstrap `ios/` via Codemagic | No | Yes (signing) |
| TestFlight on a phone | Yes — any iPhone | Yes |

### Checklist — do now (Windows)

- [ ] **Stash your downloaded plist** (run from **repo root**, not the GoogleService folder):

  ```powershell
  cd C:\Users\ujval\OneDrive\Desktop\nuggets_v3.0
  npm run setup:ios-push -- --google-service-info "C:\Users\ujval\OneDrive\Desktop\GoogleService\GoogleService-Info.plist"
  ```

  Auto-stashes to `secrets/GoogleService-Info.plist` (gitignored). Verify:

  ```powershell
  npm run setup:ios-push -- --verify
  ```

- [ ] **Preflight:**

  ```powershell
  npm run ios:preflight
  ```

- [ ] **App Store icon:** `npm run icons:ios`

- [ ] **Deploy to Vercel** — `NativePushRegistration`, `viewportFit: cover`

- [ ] **Codemagic** — sign up, connect GitHub; [`codemagic.yaml`](../codemagic.yaml) is in repo. **Do not run iOS build** until Apple Developer + signing secrets exist.

### Checklist — blocked until Apple Developer ($99 + device for India)

- [ ] Enroll via **Apple Developer app** (iPhone/iPad/Mac)
- [ ] Create **APNs Authentication Key** (.p8) → upload to Firebase Cloud Messaging
- [ ] Codemagic: App Store Connect API key + iOS code signing for `nuggets.one`
- [ ] Codemagic env: `GOOGLE_SERVICE_INFO_PLIST_BASE64` (encrypt plist from stash)
- [ ] First `nuggets-ios-testflight` workflow → commit generated `ios/` to git
- [ ] TestFlight install on iPhone

### When `ios/` exists (after Codemagic bootstrap)

```powershell
npm run setup:ios-push -- --google-service-info secrets\GoogleService-Info.plist
npm run cap:sync
```

---

## Windows-side prep (before Codemagic)

Complete these on Windows **before** the first cloud iOS build:

1. **Apple Developer Program** ($99/yr) — enroll at [developer.apple.com](https://developer.apple.com)
2. **Firebase iOS app** — bundle ID `nuggets.one`; download `GoogleService-Info.plist`
3. **APNs in Firebase** — upload APNs Auth Key (.p8) from Apple Developer → Keys
4. **Repo prep** (this PR):
   - `NativePushRegistration` registers tokens with `platform: 'ios'`
   - `npm run ios:preflight` — checks readiness
   - `npm run icons:ios` — App Store 1024×1024 icon
   - `npm run setup:ios-push -- --google-service-info <path>` — copies plist when `ios/` exists

---

## Push release decision (native vs website)

| Change type | TestFlight upload? | Vercel deploy? |
|-------------|-------------------|----------------|
| Feed UI, detail sheet, bookmarks | No | Yes |
| Push registration component / API | No | Yes |
| Add `@capacitor/push-notifications` or change entitlements | **Yes** | Maybe |
| New `GoogleService-Info.plist` / Firebase iOS app | **Yes** | Server unchanged if same FCM project |

Server path is shared with Android — see [PUSH_NOTIFICATIONS_ARCHITECTURE.md](./PUSH_NOTIFICATIONS_ARCHITECTURE.md). iOS tokens use FCM → APNs; no separate backend.

---

## One-time Firebase setup (browser, no Mac)

1. [Firebase Console](https://console.firebase.google.com) → Project Settings → Your apps → **Add iOS app**
2. Bundle ID: `nuggets.one` (matches [capacitor.config.ts](../capacitor.config.ts))
3. Download `GoogleService-Info.plist` — store securely, do not commit
4. Project Settings → Cloud Messaging → **Apple app configuration** → upload APNs Authentication Key (.p8)
   - Create key in [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list) with **Apple Push Notifications service (APNs)** enabled
5. After `ios/` exists locally or from Codemagic artifact:

```powershell
npm run setup:ios-push -- --google-service-info "C:\Downloads\GoogleService-Info.plist"
```

`FCM_SERVICE_ACCOUNT_JSON` on Vercel is shared with Android — run `npm run setup:android-push` if not already set.

---

## Bootstrap `ios/` project (Codemagic — next phase)

The `ios/` folder is generated by `npx cap add ios` on macOS. **Codemagic** runs this on first build; commit the resulting `ios/` folder to git.

Until `ios/` exists:

```powershell
npm run ios:preflight   # expects ios/ missing — prints bootstrap checklist
```

After bootstrap:

```powershell
$env:CAPACITOR_SERVER_URL='https://www.nuggets.one'
npm run cap:sync
npm run ios:preflight
```

---

## Codemagic setup

[`codemagic.yaml`](../codemagic.yaml) is in the repo (workflow `nuggets-ios-testflight`). Use a **personal** Codemagic account for 500 free macOS minutes/month.

### Checklist

1. Sign up at [codemagic.io](https://codemagic.io) (personal account)
2. Connect GitHub repo — Codemagic detects `codemagic.yaml`
3. **Team integrations** → App Store Connect API key (after Apple Developer enrollment)
4. **Code signing identities** → iOS distribution cert + App Store profile for `nuggets.one`
5. **Environment variables** (encrypted):
   - `GOOGLE_SERVICE_INFO_PLIST_BASE64` — base64 of your stashed plist:

     ```powershell
     [Convert]::ToBase64String([IO.File]::ReadAllBytes("secrets\GoogleService-Info.plist"))
     ```

6. Edit `codemagic.yaml`: set `app_store_connect` integration name, `APP_STORE_APP_ID`, notification email
7. **Manual trigger only** until signing works — then enable `triggering` block if desired
8. First successful build: **commit `ios/`** folder to git

Hosted mode: workflow runs `prepare-ios-ci.mjs` (no Next.js build). WebView loads `CAPACITOR_SERVER_URL`.

---

## TestFlight internal testing

1. [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **+** → New App
   - Platform: iOS
   - Bundle ID: `nuggets.one`
   - SKU: e.g. `nuggets-one-ios`
2. Upload build from Codemagic (or Xcode Archive)
3. **TestFlight** → **Internal Testing** → add testers (Apple IDs on your team, max 100 internal)
4. Testers install **TestFlight** app → accept invite → install Nuggets

Internal testers get builds without App Review. External testers require Beta App Review.

---

## QA checklist (real iPhone required)

Simulator is not enough for push and some auth flows.

- [ ] App opens to `https://www.nuggets.one` (feed loads)
- [ ] Safe area: bottom nav clears home indicator (notch devices)
- [ ] Email/password sign-in works
- [ ] Google sign-in — if blocked in WKWebView, use email/password for v1 (see plan)
- [ ] Bookmarks work when signed in
- [ ] Notification permission prompt → token registers with `platform: 'ios'`
- [ ] Tap push notification → deep-links to nugget or stream
- [ ] Force-close and reopen after Vercel deploy picks up web changes (no TestFlight rebuild)

Preflight before each native release:

```powershell
npm run ios:preflight
npm run icons:ios
```

---

## Version bumps

When uploading a new TestFlight build, increment in Xcode / `ios/App/App.xcodeproj`:

- **CFBundleShortVersionString** (marketing version, e.g. `1.0.1`)
- **CFBundleVersion** (build number, must increase every upload)

Document release notes in App Store Connect per build.

---

## Store assets

See [STORE_LISTING_ASSETS.md](./STORE_LISTING_ASSETS.md) iOS section:

- App Store icon 1024×1024 — `npm run icons:ios` → `public/store/ios-app-store-icon-1024.png`
- iPhone 6.7" screenshots (1290×2796)

Privacy nutrition labels: mirror data practices from [PLAY_CONSOLE_COMPLIANCE.md](./PLAY_CONSOLE_COMPLIANCE.md).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ios/` missing | Not bootstrapped yet | Run first Codemagic build or `npx cap add ios` on macOS |
| Push never registers | Missing plist or APNs key in Firebase | Firebase Console + `setup:ios-push` |
| Blank WebView | Wrong `CAPACITOR_SERVER_URL` | Set `https://www.nuggets.one` before `cap:sync` |
| Google sign-in fails | Google blocks embedded WebView | Email/password v1; or `@capacitor/browser` later |
| Codemagic signing fails | Certs / bundle ID mismatch | Match `nuggets.one` everywhere |

---

## Commands reference

| Command | Purpose |
|---------|---------|
| `npm run ios:preflight` | Check plist, `ios/`, push component before release |
| `npm run icons:ios` | Generate 1024×1024 App Store icon |
| `npm run setup:ios-push` | Stash or copy `GoogleService-Info.plist` |
| `npm run setup:ios-push -- --verify` | Verify stashed plist |
| `npm run cap:prepare:ios-ci` | CI bootstrap (Codemagic script) |
| `npm run cap:sync` | Sync Capacitor config into native projects |
| `npm run cap:open:ios` | Open Xcode (requires Mac + existing `ios/`) |
