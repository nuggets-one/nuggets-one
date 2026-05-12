# Vercel Free Plan Follow-Up Notes

## Why this exists
This document captures the current production trade-offs when launching on Vercel Hobby and the follow-up decisions that must be revisited before or shortly after launch.

## Current state

### 1) Cron schedule is reduced for Hobby compatibility
- File: `vercel.json`
- Current schedule: `0 0 * * *`
- Reason: Vercel Hobby does not allow high-frequency cron schedules.

### 2) Custom Cloudinary image loader is currently enabled
- File: `next.config.ts`
- Current config:
  - `images.loader = 'custom'`
  - `images.loaderFile = './lib/cloudinary-loader.ts'`
  - `images.remotePatterns` allow `res.cloudinary.com` and `i.ytimg.com`
- Reason: keep image delivery and transformation behavior aligned with the blueprint and card/detail media contracts.

## Current trade-offs

### Notifications trade-off (important)
- Above-cap notification fan-out queue is now drained once daily (not every minute).
- Potential impact: users in very large publish batches can see delayed notifications (up to ~24h).
- In-cap synchronous fan-out behavior is unchanged.

### Image optimization trade-off
- The custom Cloudinary loader is active again, so image delivery behavior depends on that loader remaining stable across local, preview, and production environments.
- Potential impact: runtime or serialization regressions can show up only at deploy time if the loader and consuming components drift.
- Mitigation: keep `npm run build`, preview smoke checks, and candidate-route validation in the release gate before launch.

## When to revisit
- Upgrade to Vercel Pro (or another plan that supports higher-frequency cron).
- Notification timeliness becomes a product issue for high-recipient publishes.
- Performance monitoring shows image delivery needs further optimization.
- Release validation shows loader-related regressions or runtime/client boundary issues.

## Revisit options

### Option A: Keep Vercel Hobby
- Keep daily cron.
- Add an admin/manual fan-out drain trigger for urgent sends.
- Monitor queue age and publish-to-notification latency.
- Explicitly accept that large-recipient publishes may notify users much later than the publish event.

### Option B: Upgrade Vercel plan
- Restore frequent cron schedule (e.g., every minute) after plan change.
- Re-validate fan-out drain behavior and duplicate protection.

### Option C: Simplify image delivery if the custom loader becomes a liability
- Fall back to the default Next.js loader or a simpler Cloudinary URL strategy only after validating bundle/runtime behavior.
- Validate with:
  - local `npm run build`
  - preview deploy smoke test
  - homepage/detail runtime check

## Launch decision checklist
- [ ] Decide whether once-daily above-cap notification drain is acceptable for launch.
- [ ] If not acceptable, upgrade plan or add a manual urgent-drain operator path before launch.
- [ ] Run the `Release Readiness` workflow against a real deploy candidate.
- [ ] Re-check `vercel.json` and `next.config.ts` before launch to confirm docs still match config.

## Verification checklist for future revisit
- [ ] Deployment succeeds on Vercel.
- [ ] `/` and detail pages load with no client/server serialization errors.
- [ ] Notifications fan-out drains as expected under load.
- [ ] No duplicate notifications on retry/cron reruns.
- [ ] Image delivery/perf metrics meet target thresholds.

