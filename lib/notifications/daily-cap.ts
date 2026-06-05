/** Blueprint §6.6 — max single-article in-app rows per user per UTC day per stream. */
export const DAILY_SINGLE_CAP = 5 as const

export function buildDailyDigestBatchKey(
  stream: 'standard' | 'pulse',
  now: Date = new Date()
): string {
  const y = now.getUTCFullYear()
  const mo = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${stream}:${y}-${mo}-${d}`
}

export function utcDayStartIso(now: Date = new Date()): string {
  const y = now.getUTCFullYear()
  const mo = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${d}T00:00:00.000Z`
}

export function digestTitleForOverflow(
  stream: 'standard' | 'pulse',
  count: number
): string {
  const label = stream === 'pulse' ? 'Market Pulse' : 'Nuggets'
  if (count === 1) return `1 more ${label} update`
  return `${count} more ${label} updates`
}

export function parseOverflowCount(body: string | null, title: string | null): number {
  if (body) {
    const n = Number.parseInt(body, 10)
    if (Number.isFinite(n) && n > 0) return n
  }
  const match = (title ?? '').match(/^(\d+)/)
  return match ? Number.parseInt(match[1], 10) : 0
}

export function partitionRecipientsByDailyCap(
  recipientIds: string[],
  singleCounts: Map<string, number>
): { singleRecipients: string[]; overflowRecipients: string[] } {
  const singleRecipients: string[] = []
  const overflowRecipients: string[] = []

  for (const userId of recipientIds) {
    const count = singleCounts.get(userId) ?? 0
    if (count < DAILY_SINGLE_CAP) {
      singleRecipients.push(userId)
    } else {
      overflowRecipients.push(userId)
    }
  }

  return { singleRecipients, overflowRecipients }
}
