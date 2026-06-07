# Google Play Console Compliance — Nuggets

Complete these forms in [Google Play Console](https://play.google.com/console) before **Closed testing** or **Production**. Production is blocked until all policy tasks show complete.

Related: [STORE_LISTING_COPY.md](./STORE_LISTING_COPY.md) · [STORE_LISTING_ASSETS.md](./STORE_LISTING_ASSETS.md) · [ANDROID_PLAY_PUBLISHING.md](./ANDROID_PLAY_PUBLISHING.md)

---

## Quick checklist (complete in Play Console)

Copy answers from sections below into each form. Check off as you submit:

- [ ] Privacy policy URL set: `https://nuggets.one/legal/privacy`
- [ ] Data safety form submitted (use [Data safety form](#data-safety-form-draft-answers) section)
- [ ] Content rating (IARC) completed (use [Content rating](#content-rating-iarc-questionnaire) section)
- [ ] Target audience and content declared (use [Target audience](#target-audience-and-content) section)
- [ ] Ads declaration: No ads
- [ ] App access instructions for reviewers — paste password into Play Console only (see [App access](#app-access-for-google-play-reviewers))
- [ ] News app declaration (if prompted for your category/region)

---

## Privacy policy

| Field | Value |
|-------|-------|
| Privacy policy URL | `https://nuggets.one/legal/privacy` |
| Terms | `https://nuggets.one/legal/terms` |
| Contact | `https://nuggets.one/legal/contact` |

Ensure pages load without auth and match live CMS content.

---

## Data safety form (draft answers)

Declare based on **actual** production behavior. Adjust if your deployment differs.

### Does your app collect or share user data?

**Yes** — the app collects some data when users sign in or enable notifications.

### Data types collected

| Data type | Collected | Shared | Purpose | Required or optional |
|-----------|-----------|--------|---------|----------------------|
| Email address | Yes (via Google OAuth / Supabase Auth) | With Supabase (hosting) | Account management, authentication | Optional — sign-in is optional for reading |
| Name | Yes (from Google profile if provided) | With Supabase | Account display | Optional |
| App interactions (bookmarks) | Yes, when signed in | With Supabase | App functionality | Optional |
| App interactions (notification prefs) | Yes, when signed in | With Supabase | App functionality | Optional |
| Device or other IDs (FCM token) | Yes, when notifications enabled | With Google Firebase (FCM) | Push notifications | Optional — user grants `POST_NOTIFICATIONS` |
| Diagnostics (crash logs) | Via Play Console Android vitals only | With Google (Play) | Analytics / stability | Automatic on Play builds |

### Data handling

| Question | Answer |
|----------|--------|
| Is data encrypted in transit? | **Yes** (HTTPS) |
| Can users request data deletion? | **Declare per privacy policy** — account self-deletion is not in-app today; document contact path for requests |
| Is collection required to use the app? | **No** — feed and articles are readable without sign-in |
| Prominent disclosure before collection? | **Yes** — OAuth consent screen; Android notification permission prompt |

### Third parties data is shared with

- **Supabase** — authentication, bookmarks, notification preferences (PostgreSQL, EU/US per your project region)
- **Google Firebase Cloud Messaging** — push delivery to device tokens
- **Vercel** — hosts web app and API routes
- **Google Analytics** — if `NEXT_PUBLIC_GA_ID` is set in production (page views)

### Security practices

- Data encrypted in transit (TLS)
- Users can request deletion via contact channel (state your process)

---

## Content rating (IARC questionnaire)

Nuggets is a **curated knowledge / news-style reader**. No user-generated public content, no gambling, no violence, no mature themes.

**Suggested answers (verify each question in Console):**

| Topic | Typical answer |
|-------|----------------|
| Violence | None |
| Sexuality | None |
| Language | None or infrequent (depends on article sources — curated editorial) |
| Controlled substances | None |
| User-generated content | No public UGC |
| User communication | No in-app messaging |
| Shares location | No |
| Digital purchases | No |
| Ads | No |

Expected rating: **Everyone / Low maturity** (confirm IARC result in Console).

---

## Target audience and content

| Field | Recommendation |
|-------|----------------|
| Target age group | **18 and over** or **not designed for children** — financial/market curated content; not a kids app |
| Appeal to children | **No** |
| COVID-19 contact tracing / status app | **No** |
| Government app | **No** |

---

## Ads

**No**, the app does not contain ads.

---

## App access (for Google Play reviewers)

The app loads `https://www.nuggets.one` in a WebView. Core reading works **without** login.

**Login-gated features:** Bookmarks, notification preferences, bell panel history.

### Instructions to provide in Console → App access

```
Nuggets loads our public website. Reviewers can browse the home feed and open articles without signing in.

To test signed-in features (bookmarks, notifications):
1. Open the app and tap Sign in.
2. Sign in with email and password using the test account below (not Google OAuth).
3. Bookmark an article from the feed or detail page.
4. Open Bookmarks from the header or bottom navigation.
5. For notifications: allow the Android notification permission when prompted after sign-in.

Test account:
  Email: review@nuggets.one
  Password: [paste the reviewer password here — do not commit to git]

Push notifications require a Play-installed build with POST_NOTIFICATIONS; optional for store review of reading/bookmark flows.
```

**Action required:** Paste the reviewer password into Play Console **App access** only. Email is confirmed in production Supabase Auth (`email_confirmed_at` set via `node scripts/confirm-auth-user.mjs review@nuggets.one`).

---

## News app declaration

If Google prompts (category **News & Magazines** or regional news rules):

- Publisher: your legal entity name
- Website: `https://nuggets.one`
- Content: curated editorial summaries and links, not user-submitted news
- Contact: from `/legal/contact`

---

## Permissions justification (Console + store listing)

| Permission | Why |
|------------|-----|
| `INTERNET` | Loads web content and APIs |
| `POST_NOTIFICATIONS` | Optional publish alerts via FCM |

---

## Pre-submit verification

```powershell
# Push health (production)
curl -s https://www.nuggets.one/api/health/push

# Privacy policy reachable
curl -sI https://nuggets.one/legal/privacy
```

Expected: push `configured: true` when FCM is wired; privacy returns `200`.

---

## After approval

- Revisit Data safety if you add analytics, ads, account deletion, or new data types
- Update this doc when privacy policy changes
