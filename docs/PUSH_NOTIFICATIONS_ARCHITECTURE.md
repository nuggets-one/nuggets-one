# Push Notifications Architecture

## Decision

Broadcast push notifications use FCM topic messaging. Nugget publishes enqueue one row in `push_topic_outbox` per target stream topic, then a Supabase Edge Function sends that topic message through FCM HTTP v1.

This keeps the high-volume path off Vercel cron and avoids per-device fan-out for normal broadcasts.

## Topics

| Stream | FCM topic |
| --- | --- |
| Nuggets | `nuggets-stream-standard` |
| Market Pulse | `nuggets-stream-pulse` |

Device registration syncs topic membership from `notification_preferences`:

- `mute_all=true` unsubscribes from every topic.
- `stream_standard=false` unsubscribes from `nuggets-stream-standard`.
- `stream_pulse=false` unsubscribes from `nuggets-stream-pulse`.
- Guest installs default to both topics while notifications are enabled.

## Delivery Flow

1. App registers a token through `POST /api/push/register`.
2. Server stores the token in `push_device_tokens`.
3. Server subscribes/unsubscribes the token to FCM stream topics.
4. Admin publishes a nugget.
5. In-app bell rows are still written to `user_notifications`.
6. Push enqueue writes one `push_topic_outbox` row for immediate push, or accumulates a `push_digest_buffer` row for batched push.
7. On each sender run, the Supabase Edge Function `push-topic-outbox` promotes **closed** digest buffers into one `push_topic_outbox` row per window, then sends unsent topic rows via FCM and writes `push_delivery_attempts`.

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

## Compatibility

The existing Next route `GET /api/cron/push-outbox` drains legacy per-token outboxes and can flush digest buffers as a fallback. It is not scheduled in `vercel.json`; normal digest delivery does not depend on it — the Edge Function owns buffer flush and topic send.

Future iOS apps can use the same backend path by registering iOS FCM tokens. Configure APNs credentials in Firebase, and FCM will route iOS delivery through APNs.
