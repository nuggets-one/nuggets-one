const DEFAULT_SITE_URL = 'https://nuggets.one'

/** Production canonical origin — no trailing slash. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const base = raw || DEFAULT_SITE_URL
  return base.replace(/\/+$/, '')
}

export function getDefaultOgImageUrl(): string {
  return `${getSiteUrl()}/og-default.png`
}
