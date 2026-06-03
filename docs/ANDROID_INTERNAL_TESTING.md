# Android internal testing — updates and push release

Non-engineer guide for Google Play **Internal testing**. Engineers: see [Build and upload](#build-and-upload-aab) and [Push release decision](#push-release-decision-native-vs-website).

---

## Do testers get updates automatically?

**No.** Google Play does not update phones by itself. After changes, someone must **upload a new Android App Bundle (`.aab`)** to **Internal testing** with a **higher `versionCode`** than the build already on Play. Testers then update from the **Play Store** app (same account that accepted the opt-in link).

The internal testing **opt-in link** enrolls testers; it does **not** replace uploading new versions.

---

## Push release decision (native vs website)

Nuggets Android is a **Capacitor** shell: most UI loads from the hosted site (`CAPACITOR_SERVER_URL`, production `https://www.nuggets.one`). Updates split into two paths:

| Layer | Examples | How testers get it |
|-------|----------|-------------------|
| **Website + server** | Push token API, registration UI, notification send/cron, Supabase migrations | **Vercel production deploy** — force-close app and reopen (no Play upload) |
| **Native Android** | `@capacitor/push-notifications`, `google-services.json`, `POST_NOTIFICATIONS`, Capacitor sync into `android/` | **New `.aab` on Internal testing** — Play Store → Update |

**For the current push rollout (as of version 1.1 / versionCode 2):**

- **Play upload required** if the build testers installed was **before** push native setup (no Firebase plugin, no `google-services.json`, or `versionCode` 1 without push permissions).
- **Vercel deploy required** for server push (`FCM_SERVICE_ACCOUNT_JSON`, cron routes, DB migrations). Run `npm run db:apply-push-migration` in the right Supabase project if not already applied.
- **Both** are required for end-to-end push on devices that only have the old internal build.

Quick check: In Play Console → Internal testing → latest release, if **version code** is still **1**, testers do **not** have native push — upload **version code 2** (1.1) from this repo.

---

## Build and upload (AAB)

### Prerequisites (one-time)

1. **Upload keystore** — create or use the same keystore as the first Play upload. Store path and passwords securely (not in git).
2. **`android/keystore.properties`** (gitignored) — copy from example:

   ```properties
   storeFile=../path/to/upload-keystore.jks
   storePassword=***
   keyAlias=upload
   keyPassword=***
   ```

3. **Firebase** — `android/app/google-services.json` present (from Firebase Console, package `nuggets.one`). Server: `FCM_SERVICE_ACCOUNT_JSON` on Vercel (`npm run setup:android-push`).

### Build steps (engineer or scripted)

From repo root:

```powershell
$env:CAPACITOR_SERVER_URL='https://www.nuggets.one'
npm run cap:sync
npm run cap:bundle:android
```

Output (unsigned path may vary): `android/app/build/outputs/bundle/release/app-release.aab`

If signing is configured in `android/app/build.gradle` via `keystore.properties`, the bundle is **release-signed** for Play.

### Upload in Google Play Console

1. Open [Google Play Console](https://play.google.com/console) → **Nuggets** (`nuggets.one`).
2. **Test and release** → **Testing** → **Internal testing**.
3. **Create new release** → upload **`app-release.aab`**.
4. **Release notes** (example): `Push notifications; accept notification permission when prompted.`
5. **Review release** → **Start rollout to Internal testing**.
6. Wait until status is **Available** (review can take hours).

### Testers tab

- Every tester’s **Google account** must be on the internal tester list (or in the linked Google Group).
- They must have opened the **Copy link** opt-in URL at least once.

---

## What testers do after rollout

1. Open **Google Play Store** → **Updates** (or search **Nuggets**).
2. Tap **Update** when offered (not instant; can take a few hours).
3. Same Google account as internal testing invite.
4. If no update: confirm rollout finished in Console; wait; or uninstall and reinstall via the **same** opt-in link.

No new opt-in link is needed per version if already enrolled.

---

## Verify push after update

1. Install/update to **version 1.1** (version code **2**) from Play — not a USB debug APK unless explicitly testing that build.
2. Open app → sign in if your flow requires auth for token registration.
3. Accept **Notifications** when Android prompts (`POST_NOTIFICATIONS`).
4. Optional: use in-app push debug panel if enabled in your build.
5. Trigger a test publish/notification from admin or cron; confirm device receives it.

If the app is updated but push fails, check **Vercel env** (`FCM_SERVICE_ACCOUNT_JSON`) and **Supabase** push tables — not only the Play install.

---

## Version history (maintain manually)

| versionCode | versionName | Date | Notes |
|-------------|-------------|------|-------|
| 1 | 1.0 | (first internal upload) | Pre-push or initial internal test |
| 2 | 1.1 | (fill on upload) | Push: Firebase + Capacitor push plugin + POST_NOTIFICATIONS |

Before each new Play upload: increment **`versionCode`** in `android/app/build.gradle` (required by Play) and bump **`versionName`** for humans.

---

## Play Console upload checklist (you do this manually)

- [ ] Run `npm run android:preflight` (must pass)
- [ ] `npm run cap:sync` with `CAPACITOR_SERVER_URL=https://www.nuggets.one`
- [ ] `npm run cap:bundle:android` (Java + Android SDK; `android/keystore.properties` for signing)
- [ ] Play Console → **Internal testing** → **Create new release** → upload `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Release notes + **Start rollout**
- [ ] Email testers: [`ANDROID_TESTER_CHECKLIST.md`](ANDROID_TESTER_CHECKLIST.md)

---

## Copy-paste for your developer

1. Do we need **versionCode 2+** on Internal testing for this push change, or only **Vercel**?  
   → For testers on build **1**: **both** Play **2** and Vercel.
2. Please provide signed **`app-release.aab`** after `npm run cap:bundle:android`.
3. Has Internal testing rollout **completed** in Play Console?
