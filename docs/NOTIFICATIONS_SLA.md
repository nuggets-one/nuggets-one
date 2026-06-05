# Notifications — time-to-delivery SLA

Realistic delivery windows for in-app (bell) and Android push notifications. Use this when setting launch promises or debugging tester reports.

## Channels

| Channel | Storage | Delivery path |
|---------|---------|---------------|
| In-app (bell) | `user_notifications` | Synchronous on publish (≤5,000 recipients) or `pending_fanout` cron |
| Mobile push | `push_topic_outbox` plus legacy `push_*_outbox` tables | FCM topic sender via Supabase Edge Function |

## In-app notifications

| Scenario | Delivery |
|----------|----------|
| ≤5,000 opted-in users per stream | **Immediate** on admin publish |
| >5,000 opted-in users | First 5,000 immediate; remainder via `pending_fanout` queue |
| Daily per-user cap (§6.6) | Up to **5** `kind: 'single'` rows per UTC day per stream; further publishes roll into one `kind: 'digest'` summary row |

## Mobile push — topic sender

Broadcast push uses FCM topics and the Supabase Edge Function `push-topic-outbox`. The Vercel cron schedule is not part of the broadcast path.

| Mode | Expected delivery |
|------|-------------------|
| Immediate topic push (admin checkbox) | Next Supabase sender run, typically **1-5 minutes** |
| Digest topic push (default) | Digest window close + next Supabase sender run |
| Legacy per-token rows | Manual compatibility drain through `POST /api/admin/notifications/drain` |
| Above-cap in-app fan-out | Still depends on `pending_fanout` drain |

### Digest interval interaction (site setting: 1 / 2 / 3 hours)

The digest interval controls when `push_digest_buffer` windows close. Buffers flush when the sender or manual compatibility drain runs after the window closes.

With the Supabase sender scheduled every 5 minutes and a **1-hour** digest interval:

- Example publish at **10:05 UTC** → digest window closes **11:00 UTC**
- Sender run at **11:00-11:05 UTC**
- **Time-to-push: ~55-60 minutes** after publish

## Operator commands

### Health check

```bash
curl -s https://<deploy-url>/api/health/push
```

Expect `status: "ok"` and `configured: true` before declaring push live.

Statuses:

- `misconfigured` — `FCM_SERVICE_ACCOUNT_JSON` missing
- `degraded` — backlog ≥ 50 items (immediate + digest outbox + fan-out queue + digest buffers)
- `ok` — configured and backlog below threshold

### Manual drain (urgent / breaking news)

```bash
curl -s -X POST https://<supabase-project>.supabase.co/functions/v1/push-topic-outbox \
  -H "Authorization: Bearer $CRON_SECRET"
```

Compatibility drain for legacy rows and above-cap in-app fan-out:

```bash
curl -s -X POST https://<deploy-url>/api/admin/notifications/drain \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"targets":["fanout","push"]}'
```

Also callable by an authenticated admin session (no secret) from the browser for future admin UI.

Targets:

- `fanout` — drain `pending_fanout` (above-cap in-app)
- `push` — compatibility drain for topic rows and legacy push outboxes

## Throughput caps (application code)

| Limit | Value |
|-------|-------|
| Sync fan-out per publish | 5,000 users |
| Fan-out cron / manual drain batch | 25 `pending_fanout` rows per invocation |
| Supabase topic sender batch | 25 topic rows per invocation |
| Next compatibility push drain | 100 rows per queue type (topic, immediate, digest, legacy) |
| FCM project rate | 600,000 messages/minute (platform; not a PMF bottleneck) |

## Launch checklist hooks

- [ ] `GET /api/health/push` returns `configured: true` on production
- [ ] `FCM_SERVICE_ACCOUNT_JSON` set on Vercel and Supabase Edge Function secrets
- [ ] `CRON_SECRET` set; Supabase sender tested once
- [ ] Supabase cron or external cron invokes `push-topic-outbox` every 1-5 minutes

See also: [`PUSH_NOTIFICATIONS_ARCHITECTURE.md`](PUSH_NOTIFICATIONS_ARCHITECTURE.md), [`ANDROID_INTERNAL_TESTING.md`](ANDROID_INTERNAL_TESTING.md).
