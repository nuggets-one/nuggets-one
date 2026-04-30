# Vercel Free Plan Follow-Up Notes

## Why this exists
This document captures deployment-related changes made to get production deploys working on Vercel Hobby (free) and lists what to revisit later.

## Changes made

### 1) Cron schedule reduced for Hobby compatibility
- File: `vercel.json`
- Changed notifications fan-out cron from `* * * * *` to `0 0 * * *`
- Reason: Vercel Hobby does not allow high-frequency cron schedules.

### 2) Custom Next.js image loader removed
- File: `next.config.ts`
- Removed:
  - `images.loader = 'custom'`
  - `images.loaderFile = './lib/cloudinary-loader.ts'`
- Reason: reduce runtime boundary/serialization risk and stabilize deploy/runtime behavior.

## Current trade-offs

### Notifications trade-off (important)
- Above-cap notification fan-out queue is now drained once daily (not every minute).
- Potential impact: users in very large publish batches can see delayed notifications (up to ~24h).
- In-cap synchronous fan-out behavior is unchanged.

### Image optimization trade-off
- No global Cloudinary custom loader URL transform pipeline via `next.config.ts`.
- App still uses `next/image` with allowed remote domains (`res.cloudinary.com`, `i.ytimg.com`).
- Potential impact: less fine-grained Cloudinary transform tuning compared with a custom loader.

## When to revisit
- Upgrade to Vercel Pro (or another plan that supports higher-frequency cron).
- Notification timeliness becomes a product issue for high-recipient publishes.
- Performance monitoring shows image delivery needs further optimization.
- Runtime/client boundary issues are fully understood and safe alternatives are validated.

## Revisit options

### Option A: Keep Vercel Hobby
- Keep daily cron.
- Add an admin/manual fan-out drain trigger for urgent sends.
- Monitor queue age and publish-to-notification latency.

### Option B: Upgrade Vercel plan
- Restore frequent cron schedule (e.g., every minute) after plan change.
- Re-validate fan-out drain behavior and duplicate protection.

### Option C: Re-introduce Cloudinary optimization safely
- Prefer string-based URL precompute path (no function props crossing boundaries).
- Validate with:
  - local `npm run build`
  - preview deploy smoke test
  - homepage/detail runtime check

## Verification checklist for future revisit
- [ ] Deployment succeeds on Vercel.
- [ ] `/` and detail pages load with no client/server serialization errors.
- [ ] Notifications fan-out drains as expected under load.
- [ ] No duplicate notifications on retry/cron reruns.
- [ ] Image delivery/perf metrics meet target thresholds.

