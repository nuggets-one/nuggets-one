# Production rollout checklist — Nuggets Android

Use when promoting from Closed testing to public Play Store. Full guide: [ANDROID_PLAY_PUBLISHING.md](./ANDROID_PLAY_PUBLISHING.md).

## Pre-submit gates

- [ ] Closed testing exit criteria met ([ANDROID_CLOSED_TESTING_CHECKLIST.md](./ANDROID_CLOSED_TESTING_CHECKLIST.md))
- [ ] Store listing live in Console (all required assets uploaded)
- [ ] Data safety, content rating, target audience — all complete
- [ ] App access instructions include working reviewer Gmail
- [ ] Privacy policy `https://nuggets.one/legal/privacy` returns 200
- [ ] AAB version matches tested Closed build (or newer with same soak if native changed)

## Production submit

- [ ] Play Console → **Test and release → Production**
- [ ] **Create new release** or **Promote release** from Closed testing
- [ ] Upload `app-release.aab` if not promoting
- [ ] Release notes (user-facing)
- [ ] Set **staged rollout to 10%**
- [ ] **Review release → Start rollout to Production**
- [ ] Wait for **Available** status (review complete)

## Staged rollout ramp

| Checkpoint | Action |
|------------|--------|
| Day 0 (10%) | Check Android vitals — crash rate, ANR rate |
| Day 2–3 | If stable, increase to **50%** |
| Day 5–7 | If stable, increase to **100%** |

Console: Production → Release dashboard → **Manage rollout**

## Post-launch monitoring (first 7 days)

- [ ] Play Console → **Quality → Android vitals** (daily)
- [ ] `curl -s https://www.nuggets.one/api/health/push` — `configured: true`
- [ ] Vercel error logs for WebView-loaded routes
- [ ] Respond to Play Store user reviews
- [ ] Update version table in [ANDROID_PLAY_PUBLISHING.md](./ANDROID_PLAY_PUBLISHING.md)

## Rollback options

| Issue | Action |
|-------|--------|
| Bad native build | Halt staged rollout; upload fixed AAB with higher `versionCode` |
| Bad web deploy | Roll back Vercel deployment (no Play upload needed) |
| Critical crash spike | Halt rollout in Console; investigate vitals stack traces |

## Ongoing release reference

- Web-only: Vercel deploy only
- Native: `android:preflight` → bump version → `android:bundle` → Play upload

See [ANDROID_INTERNAL_TESTING.md](./ANDROID_INTERNAL_TESTING.md) for build commands.
