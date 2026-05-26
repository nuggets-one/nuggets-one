/**
 * Convert legacy timestamp syntax in markdown to canonical `[label](#yt=seconds)` links.
 * Supports bare `[H:MM:SS]` / `[MM:SS]` (common in editorial copy) and `(H:MM:SS)` / `(MM:SS)`.
 * Safe to run at render time or in ETL.
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

/**
 * Bare bracket timestamps `[H:MM:SS]` / `[MM:SS]` → canonical `#yt=` links.
 * `(?!\()` skips markdown link destinations: `[00:04:10](#yt=250)` is left alone.
 */
const BRACKET_HMS = /\[(\d{1,2}):(\d{2}):(\d{2})\](?!\()/g
const BRACKET_MS = /\[(\d{2}):(\d{2})\](?!\()/g

function replaceBracketHms(
  match: string,
  h: string,
  m: string,
  s: string,
): string {
  const seconds = hmsToSeconds(h, m, s)
  // Skip `[00:00:00]`-style placeholders (episode badges) — seek links would change card preview/copy.
  if (seconds === 0) return match
  const label = `${h}:${m}:${s}`
  return `[${label}](#yt=${seconds})`
}

function replaceBracketMs(match: string, m: string, s: string): string {
  const seconds = msToSeconds(m, s)
  if (seconds === 0) return match
  const label = `${m}:${s}`
  return `[${label}](#yt=${seconds})`
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
 * Rewrites `[H:MM:SS]`, `[MM:SS]`, `(H:MM:SS)`, `(MM:SS)` to `[label](#yt=seconds)`,
 * skipping patterns already tied to link destinations `( ... )`.
 */
export function normalizeParenTimestampsInMarkdown(markdown: string): string {
  return markdown
    .replace(BRACKET_HMS, replaceBracketHms)
    .replace(BRACKET_MS, replaceBracketMs)
    .replace(PAREN_PREFIX, replaceHms)
    .replace(PAREN_PREFIX_MS, replaceMs)
}
