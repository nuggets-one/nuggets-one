const WINDOW_MS = 30_000
const MAX_REQUESTS = 30
const MAX_BUCKETS = 5_000

const buckets = new Map<string, number[]>()

function pruneBuckets(now: number) {
  const cutoff = now - WINDOW_MS

  for (const [key, timestamps] of buckets.entries()) {
    const recent = timestamps.filter((timestamp) => timestamp > cutoff)
    if (recent.length === 0) {
      buckets.delete(key)
      continue
    }
    buckets.set(key, recent)
  }

  if (buckets.size <= MAX_BUCKETS) return

  const orderedByRecentActivity = Array.from(buckets.entries()).sort(
    (a, b) => (a[1][a[1].length - 1] ?? 0) - (b[1][b[1].length - 1] ?? 0)
  )

  const overflow = buckets.size - MAX_BUCKETS
  for (let i = 0; i < overflow; i++) {
    const key = orderedByRecentActivity[i]?.[0]
    if (key) buckets.delete(key)
  }
}

export function isSuggestRateLimited(key: string, now = Date.now()): boolean {
  if (buckets.size > MAX_BUCKETS) {
    pruneBuckets(now)
  }

  const cutoff = now - WINDOW_MS
  const existing = buckets.get(key) ?? []
  const recent = existing.filter((timestamp) => timestamp > cutoff)

  if (recent.length >= MAX_REQUESTS) {
    buckets.set(key, recent)
    return true
  }

  recent.push(now)
  buckets.set(key, recent)
  return false
}
