import 'server-only'

import { drainPendingFanout } from '@/lib/notifications/drain-fanout'
import { drainPushOutbox } from '@/lib/notifications/push-outbox'

export type DrainTarget = 'fanout' | 'push'

export type NotificationDrainResult = {
  fanout?: { drained: number }
  push?: Awaited<ReturnType<typeof drainPushOutbox>>
}

export async function drainNotifications(
  targets: DrainTarget[]
): Promise<NotificationDrainResult> {
  const unique = [...new Set(targets)]
  const result: NotificationDrainResult = {}

  if (unique.includes('fanout')) {
    result.fanout = await drainPendingFanout()
  }

  if (unique.includes('push')) {
    result.push = await drainPushOutbox()
  }

  return result
}
