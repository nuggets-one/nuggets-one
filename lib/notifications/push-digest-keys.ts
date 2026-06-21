import { getStreamLabel } from '@/lib/copy/streams'
import type { ContentStream } from '@/types/article'

export type DigestStream = ContentStream

export function buildDigestBatchKey(
  stream: DigestStream,
  now: Date = new Date(),
  intervalHours: number
): string {
  const y = now.getUTCFullYear()
  const mo = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const h = now.getUTCHours()
  const windowStart = Math.floor(h / intervalHours) * intervalHours
  const hh = String(windowStart).padStart(2, '0')
  return `${stream}:${y}-${mo}-${d} ${hh}:00`
}

export function parseBatchKeyWindowEnd(batchKey: string, intervalHours: number): Date | null {
  const match = batchKey.match(
    /^(standard|pulse|charts|tech_vc|geopolitics|leadership):(\d{4})-(\d{2})-(\d{2}) (\d{2}):00$/
  )
  if (!match) return null
  const [, , y, mo, d, hh] = match
  const start = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), 0, 0, 0)
  return new Date(start + intervalHours * 60 * 60 * 1000)
}

export function isDigestWindowClosed(
  batchKey: string,
  intervalHours: number,
  now: Date
): boolean {
  const windowEnd = parseBatchKeyWindowEnd(batchKey, intervalHours)
  return windowEnd != null && now >= windowEnd
}

export function streamPushLabel(stream: DigestStream): string {
  return getStreamLabel(stream)
}
