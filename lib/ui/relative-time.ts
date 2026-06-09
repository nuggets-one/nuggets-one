/**
 * Server-safe relative time for skim rows — no date-fns.
 */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const timestamp = date.getTime()
  if (Number.isNaN(timestamp)) return ''

  const diffSec = Math.round((timestamp - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' })

  const absSec = Math.abs(diffSec)
  if (absSec < 60) return rtf.format(diffSec, 'second')

  const diffMin = Math.round(diffSec / 60)
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute')

  const diffHour = Math.round(diffSec / 3600)
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour')

  const diffDay = Math.round(diffSec / 86400)
  if (Math.abs(diffDay) < 7) return rtf.format(diffDay, 'day')

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}
