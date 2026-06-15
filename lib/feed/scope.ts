import type { ContentStream } from '@/types/article'

/** Official subtopic slug for India geography scope. */
export const INDIA_SUBTOPIC_SLUG = 'india' as const

export const FEED_SCOPES = ['global', 'india'] as const
export type FeedScope = (typeof FEED_SCOPES)[number]

export const DEFAULT_FEED_SCOPE: FeedScope = 'global'

export function parseFeedScope(raw: string | null | undefined): FeedScope {
  if (raw === 'india') return 'india'
  return 'global'
}

export function isScopeEnabledStream(stream: ContentStream): stream is 'standard' | 'pulse' {
  return stream === 'standard' || stream === 'pulse'
}

/** Resolved scope for query/UI — undefined on Charts (scope ignored). */
export function resolveFeedScope(
  stream: ContentStream,
  rawScope: string | null | undefined
): FeedScope | undefined {
  if (!isScopeEnabledStream(stream)) return undefined
  return parseFeedScope(rawScope)
}

/** Scope for feed queries when `scope` is already parsed. */
export function effectiveFeedScope(
  stream: ContentStream,
  scope?: FeedScope
): FeedScope | undefined {
  if (!isScopeEnabledStream(stream)) return undefined
  return scope ?? DEFAULT_FEED_SCOPE
}

export function getScopeLabel(scope: FeedScope): string {
  return scope === 'india' ? 'India' : 'Global'
}

export function buildHomeHref(stream: ContentStream, scope?: FeedScope): string {
  const params = new URLSearchParams()
  if (stream !== 'standard') params.set('stream', stream)
  if (scope === 'india' && isScopeEnabledStream(stream)) {
    params.set('scope', 'india')
  }
  const qs = params.toString()
  return qs ? `/?${qs}` : '/'
}

export function buildStreamTabHref(
  targetStream: ContentStream,
  activeScope?: FeedScope
): string {
  if (targetStream === 'charts') return '/?stream=charts'
  const scope = activeScope === 'india' ? 'india' : undefined
  return buildHomeHref(targetStream, scope)
}

/**
 * Legacy `tags=india` bookmarks → `scope=india` with india stripped from tags.
 */
export function normalizeTagsAndScope(
  stream: ContentStream,
  tags: string[],
  rawScope: string | null | undefined
): { tags: string[]; scope: FeedScope | undefined; hadLegacyIndiaTag: boolean } {
  if (!isScopeEnabledStream(stream)) {
    return { tags, scope: undefined, hadLegacyIndiaTag: false }
  }

  const hadLegacyIndiaTag = tags.includes(INDIA_SUBTOPIC_SLUG)
  let scope = parseFeedScope(rawScope)
  let normalizedTags = tags

  if (hadLegacyIndiaTag) {
    scope = 'india'
    normalizedTags = tags.filter((t) => t !== INDIA_SUBTOPIC_SLUG)
  }

  return { tags: normalizedTags, scope, hadLegacyIndiaTag }
}

export function shouldHideIndiaTagSlug(stream: ContentStream): boolean {
  return isScopeEnabledStream(stream)
}

type ScopeQueryable = {
  contains(column: string, value: string[]): ScopeQueryable
  not(column: string, operator: string, value: string): ScopeQueryable
}

/** Apply India/Global filter to a Supabase articles query. */
export function applyFeedScopeFilter<T extends ScopeQueryable>(
  query: T,
  stream: ContentStream,
  scope: FeedScope | undefined
): T {
  if (!scope || !isScopeEnabledStream(stream)) return query
  if (scope === 'india') {
    return query.contains('tag_slugs', [INDIA_SUBTOPIC_SLUG]) as T
  }
  return query.not('tag_slugs', 'cs', `{${INDIA_SUBTOPIC_SLUG}}`) as T
}

/** Scope param for search RPC — null when scope does not apply. */
export function scopeToRpcParam(
  stream: ContentStream,
  scope: FeedScope | undefined
): string | null {
  if (!scope || !isScopeEnabledStream(stream)) return null
  return scope
}
