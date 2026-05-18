/**
 * Convert legacy parenthetical timestamps in markdown to canonical `#yt=` links.
 * Mirrors Project Phoenix MarkdownRenderer rules; safe to run at render time or in ETL.
 */

function hmsToSeconds(h: string, m: string, s: string): number {
  return (
    Number.parseInt(h, 10) * 3600 +
    Number.parseInt(m, 10) * 60 +
    Number.parseInt(s, 10)
  )
}

function msToSeconds(m: string, s: string): number {
  return Number.parseInt(m, 10) * 60 + Number.parseInt(s, 10)
}

/** Prefix is `^` (line start) or whitespace not immediately after `[`. */
const PAREN_PREFIX = /(^|(?<!\[)\s+)\((\d{1,2}):(\d{2}):(\d{2})\)/g
const PAREN_PREFIX_MS = /(^|(?<!\[)\s+)\((\d{2}):(\d{2})\)/g

function replaceHms(
  _match: string,
  prefix: string,
  h: string,
  m: string,
  s: string,
): string {
  const seconds = hmsToSeconds(h, m, s)
  const label = `${h}:${m}:${s}`
  const lead = prefix === '^' || prefix === '' ? '' : prefix
  return `${lead}[${label}](#yt=${seconds})`
}

function replaceMs(_match: string, prefix: string, m: string, s: string): string {
  const seconds = msToSeconds(m, s)
  const label = `${m}:${s}`
  const lead = prefix === '^' || prefix === '' ? '' : prefix
  return `${lead}[${label}](#yt=${seconds})`
}

/**
 * Rewrites `(H:MM:SS)` and `(MM:SS)` outside markdown link labels and URL query strings.
 */
export function normalizeParenTimestampsInMarkdown(markdown: string): string {
  return markdown
    .replace(PAREN_PREFIX, replaceHms)
    .replace(PAREN_PREFIX_MS, replaceMs)
}
