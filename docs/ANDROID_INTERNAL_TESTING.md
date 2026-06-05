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
| **Website + server** | Push token API, registration UI, topic enqueue, Supabase Edge Function sender, Supabase migrations | **Vercel production deploy + Supabase function deploy** — force-close app and reopen (no Play upload) |
| **Native Android** | `@capacitor/push-notifications`, `google-services.json`, `POST_NOTIFICATIONS`, Capacitor sync into `android/` | **New `.aab` on Internal testing** — Play Store → Update |

**For the current push rollout (as of version 1.1 / versionCode 2):**

- **Play upload required** if the build testers installed was **before** push native setup (no Firebase plugin, no `google-services.json`, or `versionCode` 1 without push permissions).
- **Server deploy required** for push (`FCM_SERVICE_ACCOUNT_JSON`, topic sender, DB migrations). Deploy Vercel for the app/API and deploy the Supabase Edge Function from `docs/PUSH_NOTIFICATIONS_ARCHITECTURE.md`. Run `npm run db:apply-push-migration` in the right Supabase project if not already applied.
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

You do **not** need `npm run build` (Next.js). Capacitor uses a small `mobile-web` placeholder; the app loads the hosted site from `CAPACITOR_SERVER_URL`.

**Java (CLI):** `gradlew` needs JDK 17+. PowerShell often has no `java` on PATH. `npm run cap:bundle:android` auto-detects Android Studio’s JBR. If that fails, set once per session:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
```

**Android SDK (CLI):** Gradle needs `sdk.dir` in `android/local.properties`. Open the project once in Android Studio (**File → Open → `android/`**) so Studio creates that file, or copy `sdk.dir` from another machine.

From repo root (recommended — sync + bundle):

```powershell
$env:CAPACITOR_SERVER_URL='https://www.nuggets.one'
npm run android:preflight
npm run android:bundle
```

Or sync and bundle separately:

```powershell
$env:CAPACITOR_SERVER_URL='https://www.nuggets.one'
npm run cap:sync
npm run cap:bundle:android
```

**Output:** `android/app/build/outputs/bundle/release/app-release.aab`

If `android/keystore.properties` exists, the bundle is **release-signed** for Play.

**Verify the AAB exists:**

```powershell
Test-Path 'android\app\build\outputs\bundle\release\app-release.aab'
Get-Item 'android\app\build\outputs\bundle\release\app-release.aab' | Select-Object FullName, Length, LastWriteTime
```

**Android Studio (no CLI):** **Build → Build Bundle(s) / APK(s) → Build Bundle(s)** — same output path. Run/Debug and **Build APK(s)** only create files under `outputs/apk/`, not the `.aab`.

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
5. Confirm server push health: `GET https://<deploy-url>/api/health/push` → `configured: true`, `status: ok`.
6. Publish a test article (optional: check **Notify immediately** in admin).
7. Trigger the topic sender if you do not want to wait for the scheduled Supabase cron:

```bash
curl -s -X POST https://<supabase-project>.supabase.co/functions/v1/push-topic-outbox \
  -H "Authorization: Bearer $CRON_SECRET"
```

8. Confirm device receives the notification.

If the app is updated but push fails, check **Supabase Edge Function secrets** (`FCM_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`), **`/api/health/push`**, and **Supabase** push tables — not only the Play install. See [`PUSH_NOTIFICATIONS_ARCHITECTURE.md`](PUSH_NOTIFICATIONS_ARCHITECTURE.md) and [`NOTIFICATIONS_SLA.md`](NOTIFICATIONS_SLA.md) for delivery timing expectations.

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
- [ ] `npm run android:bundle` with `CAPACITOR_SERVER_URL=https://www.nuggets.one` (or `cap:sync` + `cap:bundle:android`)
- [ ] Confirm `app-release.aab` exists; `android/keystore.properties` for signing
- [ ] Play Console → **Internal testing** → **Create new release** → upload `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Release notes + **Start rollout**
- [ ] Email testers: [`ANDROID_TESTER_CHECKLIST.md`](ANDROID_TESTER_CHECKLIST.md)

---

## Copy-paste for your developer

1. Do we need **versionCode 2+** on Internal testing for this push change, or only **Vercel**?  
   → For testers on build **1**: **both** Play **2** and Vercel.
2. Please provide signed **`app-release.aab`** after `npm run cap:bundle:android`.
3. Has Internal testing rollout **completed** in Play Console?
