# Push Notifications Architecture

## Decision

Broadcast push notifications use FCM topic messaging. Each publish enqueues **one** row in `push_topic_outbox` for the article's **primary** `content_stream` topic, then a Supabase Edge Function sends that topic message through FCM HTTP v1.

Tag-gated `visible_streams` (secondary feeds) affect feed visibility only — notifications fan out on primary `content_stream` only.

This keeps the high-volume path off Vercel cron and avoids per-device fan-out for normal broadcasts.

## Topics

| Stream | FCM topic | Preference column |
| --- | --- | --- |
| Deep-Dives | `nuggets-stream-standard` | `stream_standard` |
| Market Pulse | `nuggets-stream-pulse` | `stream_pulse` |
| Charts of the Week | `nuggets-stream-charts` | `stream_charts` |
| Tech x VC | `nuggets-stream-tech-vc` | `stream_tech_vc` |
| Geopolitics | `nuggets-stream-geopolitics` | `stream_geopolitics` |
| Leadership | `nuggets-stream-leadership` | `stream_leadership` |

Device registration syncs topic membership from `notification_preferences`:

- `mute_all=true` unsubscribes from every topic.
- `stream_standard=false` unsubscribes from `nuggets-stream-standard`.
- `stream_pulse=false` unsubscribes from `nuggets-stream-pulse`.
- `stream_charts=false` unsubscribes from `nuggets-stream-charts`.
- `stream_tech_vc=false` unsubscribes from `nuggets-stream-tech-vc`.
- `stream_geopolitics=false` unsubscribes from `nuggets-stream-geopolitics`.
- `stream_leadership=false` unsubscribes from `nuggets-stream-leadership`.
- Guest installs default to all stream topics while notifications are enabled.

After adding a new content stream, run a one-time topic resync so existing device tokens subscribe to the new FCM topic:

```bash
node scripts/resync-push-topics-all.mjs
```

## Delivery Flow

1. App registers a token through `POST /api/push/register`.
2. Server stores the token in `push_device_tokens`.
3. Server subscribes/unsubscribes the token to FCM stream topics.
4. Admin publishes a nugget.
5. In-app bell rows are still written to `user_notifications`.
6. Push enqueue writes one `push_topic_outbox` row for immediate push, or accumulates articles in `push_digest_buffer` + `push_digest_buffer_articles` for batched push.
7. On each sender run, the Supabase Edge Function `push-topic-outbox` promotes **closed** digest buffers into **one `push_topic_outbox` row per article** (headline as body, same format as immediate push), then sends unsent topic rows via FCM and writes `push_delivery_attempts`.

### Digest vs immediate notification shape

Both paths use the same visible format on device:

| Field | Value |
| --- | --- |
| `notification.title` | Stream label (`Deep-Dives`, `Market Pulse`, `Charts of the Week`, `Tech x VC`, `Geopolitics`, or `Leadership`) |
| `notification.body` | Article headline |
| `data.articleId` / `data.slug` | Deep-link to `/nuggets/[id]/[slug]` |
| `data.stream` | Primary `content_stream` — stream-only fallback uses canonical feed URLs (`/` for Pulse, `/?stream=pulse&scope=charts` for Charts) |
| `android.notification.tag` | `article:{articleId}` (per-article; notifications stack instead of replacing) |

Digest batching only changes **when** pushes send (digest window close), not **what** they display.

## Frequency Guardrails

- Default push mode is digest batching.
- Immediate push is capped at 5 sends per stream per UTC day.
- If an admin selects immediate push after that cap is reached, the publish falls back to the digest buffer.
- Stream preferences control both in-app notification rows and FCM topic membership.
- Full content is never sent in the push payload; clients open the app and fetch the nugget.

## Sender

Deploy the Supabase Edge Function:

```bash
supabase functions deploy push-topic-outbox --no-verify-jwt
```

Required function secrets:

```bash
supabase secrets set SUPABASE_URL="https://<project>.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
supabase secrets set FCM_SERVICE_ACCOUNT_JSON='<firebase-service-account-json-or-base64>'
supabase secrets set CRON_SECRET="<shared-secret>"
```

Schedule the function with Supabase cron or any external cron that supports retries:

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/push-topic-outbox" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Run it every 1-5 minutes for near-real-time push. Each run flushes completed digest buffers, then processes up to 25 topic rows. At the planned 12-15 nuggets/day, backlog should normally stay at zero.

Apply the digest-articles migration before deploying the updated function:

```bash
npm run db:apply-push-migration
```

## Compatibility

The existing Next route `GET /api/cron/push-outbox` drains legacy per-token outboxes and can flush digest buffers as a fallback. It is not scheduled in `vercel.json`; normal digest delivery does not depend on it — the Edge Function owns buffer flush and topic send.

Future iOS apps can use the same backend path by registering iOS FCM tokens. Configure APNs credentials in Firebase, and FCM will route iOS delivery through APNs.

## Web browser push

Browser push reuses the same FCM topic broadcast path as Android. Signed-in users opt in from **Account** or the bell **preferences** panel — there is no auto-prompt on page load.

### Client stack

| Piece | Path |
| --- | --- |
| Service worker | `public/firebase-messaging-sw.js` |
| SW Firebase config | `public/firebase-messaging-config.js` (generated at build) |
| Registration lifecycle | `components/push/web-push-registration.tsx` |
| Enable/disable API | `lib/push/web-push.ts` |
| FCM web token | `lib/push/get-fcm-web-token.ts` |

### Registration flow

1. User clicks **Enable browser notifications** (must be signed in).
2. Browser registers `/firebase-messaging-sw.js`.
3. Firebase Web SDK obtains an FCM token via `getToken()` + VAPID key.
4. `POST /api/push/register` with `platform: 'web'` stores the token in `push_device_tokens`.
5. `syncPushTopicsForToken` subscribes/unsubscribes stream topics from `notification_preferences` (same as Android).

On logout, the web client unregisters the token (guest browser push is deferred).

### Required env vars (Vercel)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Web Push certificate public key |

Setup helper: `npm run setup:web-push`

Build generates `public/firebase-messaging-config.js` via `npm run generate:firebase-config`.

### Platform notes

- **Chrome / Edge / Firefox (desktop)** and **Chrome Android (browser tab)**: full support.
- **Safari macOS 13+**: supported.
- **Safari iOS**: web push only when the site is installed as a Home Screen PWA (iOS 16.4+); regular Safari tabs do not receive push.
- **HTTPS required** for service worker registration (use staging/production or `next dev --experimental-https` locally).

### Explicitly not used

- `web-push` npm package / raw VAPID `PushSubscription` management — FCM Web SDK handles subscriptions.
- Separate push preference columns — stream/mute toggles control both in-app bell rows and FCM topic membership.

## Adding a new content stream (operator checklist)

When introducing a sixth (or later) stream, update **all** of the following in one PR:

1. **App types and copy** — `types/article.ts`, `lib/copy/streams.ts`, `lib/notifications/push-topics.ts`, `lib/notifications/stream-prefs.ts`.
2. **DB migration** — extend `CHECK` constraints on every table that stores `content_stream` or `stream`, including `push_digest_buffer` (easy to miss; broke Tech x VC / Geopolitics digest push once).
3. **`get_notification_recipients` RPC** — whitelist the new `stream_*` preference column.
4. **`notification_preferences`** — add boolean column + partial index.
5. **Edge Function** — `supabase/functions/push-topic-outbox/index.ts` topic map and labels.
6. **Prefs UI** — account page and bell panel toggles.
7. **Docs** — this file and product behavior docs.
8. **Post-deploy** — apply migration, deploy Edge Function if changed, run `node scripts/resync-push-topics-all.mjs`, verify with `node scripts/migrate/verify-streams-migration.mjs`.
