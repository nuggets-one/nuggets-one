export type FeedView = 'grid' | 'skim'

export const FEED_VIEW_STORAGE_KEY = 'nuggets-feed-view-mobile'

/** 1 year — mirrors localStorage persistence for server-readable opt-out. */
export const FEED_VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/**
 * Resolves mobile skim mode for the Home feed.
 * - `view=grid` → card view (explicit opt-out)
 * - `view=skim` or absent → skim by default, unless stored preference is `grid`
 */
export function resolveSkimView(
  viewParam: string | undefined | null,
  storedPreference?: string | null,
): boolean {
  if (viewParam === 'grid') return false
  if (viewParam === 'skim') return true
  if (storedPreference === 'grid') return false
  return true
}

export function parseFeedView(
  raw: string | undefined | null,
  storedPreference?: string | null,
): FeedView {
  return resolveSkimView(raw, storedPreference) ? 'skim' : 'grid'
}

export function isSkimFeedView(
  raw: string | undefined | null,
  storedPreference?: string | null,
): boolean {
  return resolveSkimView(raw, storedPreference)
}

/** Client-only — sync preference to localStorage + cookie for SSR on next visit. */
export function persistFeedViewPreference(next: FeedView): void {
  try {
    localStorage.setItem(FEED_VIEW_STORAGE_KEY, next)
  } catch {
    // ignore
  }

  if (typeof document === 'undefined') return

  if (next === 'grid') {
    document.cookie = `${FEED_VIEW_STORAGE_KEY}=grid; path=/; max-age=${FEED_VIEW_COOKIE_MAX_AGE}; SameSite=Lax`
  } else {
    document.cookie = `${FEED_VIEW_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`
  }
}
