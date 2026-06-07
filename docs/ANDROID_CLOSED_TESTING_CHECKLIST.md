# Closed testing checklist — Nuggets Android

Use before promoting to Production. Full guide: [ANDROID_PLAY_PUBLISHING.md](./ANDROID_PLAY_PUBLISHING.md).

## Before creating Closed testing release

- [ ] Internal testing exit criteria met ([ANDROID_INTERNAL_TESTING.md](./ANDROID_INTERNAL_TESTING.md))
- [ ] Store listing complete: icon, feature graphic, screenshots, descriptions ([STORE_LISTING_COPY.md](./STORE_LISTING_COPY.md))
- [ ] Play compliance forms submitted ([PLAY_CONSOLE_COMPLIANCE.md](./PLAY_CONSOLE_COMPLIANCE.md))
- [ ] `npm run android:preflight` passes
- [ ] Signed `app-release.aab` built with `CAPACITOR_SERVER_URL=https://www.nuggets.one`
- [ ] Reviewer test account (`review@nuggets.one`, email/password) confirmed and documented in App access

## Play Console steps

- [ ] **Testing → Closed testing** → create track (e.g. Beta)
- [ ] **Create new release** → upload `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Add release notes
- [ ] **Start rollout to Closed testing**
- [ ] Add 20–100 testers (email list or Google Group)
- [ ] Send opt-in link + instructions (template in [ANDROID_PLAY_PUBLISHING.md](./ANDROID_PLAY_PUBLISHING.md))

## During 1–2 week soak

- [ ] Monitor Play Console → Quality → Android vitals
- [ ] Check `GET https://www.nuggets.one/api/health/push`
- [ ] Triage tester feedback (crashes, auth, notifications, slow network)
- [ ] Ship web fixes via Vercel; native fixes via new AAB + higher `versionCode`

## Exit criteria (promote to Production)

- [ ] No P0 bugs open
- [ ] Push works on Play-installed build for at least 2 testers
- [ ] Minimum 1 week soak completed
- [ ] All Play policy tasks green
