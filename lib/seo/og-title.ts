const SITE_SUFFIX = 'Nuggets'

/** Page title and og:title — product §9/§10: "{title} · Nuggets". */
export function buildOgPageTitle(articleTitle: string): string {
  const trimmed = articleTitle.trim()
  if (!trimmed) return SITE_SUFFIX
  return `${trimmed} · ${SITE_SUFFIX}`
}
