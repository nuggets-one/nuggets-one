/**
 * Search feature flags.
 *
 * `NEXT_PUBLIC_SEARCH_GLOBAL` gates the global-by-default search behavior:
 * suggestions and committed results search across all streams/scopes, and
 * section/tag filters become optional narrowing facets instead of the primary
 * search boundary. Read on both server and client — the value is inlined at
 * build time because it is a NEXT_PUBLIC var (do NOT add 'server-only' here).
 */
export function isGlobalSearchEnabled(): boolean {
  const value = process.env.NEXT_PUBLIC_SEARCH_GLOBAL
  return value === '1' || value === 'true'
}
