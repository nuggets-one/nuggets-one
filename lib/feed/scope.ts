import { DEFAULT_FEED_STREAM, type ContentStream, type FeedStream } from '@/types/article'

/** Official subtopic slug for India geography scope. */
export const INDIA_SUBTOPIC_SLUG = 'india' as const

export const FEED_SCOPES = ['global', 'india', 'charts'] as const
export type FeedScope = (typeof FEED_SCOPES)[number]

export const DEFAULT_FEED_SCOPE: FeedScope = 'global'

export function parseFeedScope(raw: string | null | undefined): FeedScope {
  if (raw === 'india') return 'india'
  if (raw === 'charts') return 'charts'
  return 'global'
}

export function isFeedAllStream(stream: FeedStream): stream is 'all' {
  return stream === 'all'
}

export function isScopeEnabledStream(
  stream: FeedStream
): stream is 'all' | 'standard' | 'pulse' | 'tech_vc' {
  return (
    stream === 'all' ||
    stream === 'standard' ||
    stream === 'pulse' ||
    stream === 'tech_vc'
  )
}

/** Streams that ignore India/Global scope tabs (legacy top-level charts URL redirects). */
export function isScopeDisabledStream(stream: FeedStream): boolean {
  if (stream === 'all') return false
  return stream === 'charts' || stream === 'geopolitics' || stream === 'leadership'
}

export function isPulseChartsScope(
  stream: FeedStream,
  scope?: FeedScope
): boolean {
  return stream === 'pulse' && scope === 'charts'
}

/** When pulse + charts scope, query the charts corpus. */
export function resolveEffectiveContentStream(
  stream: FeedStream,
  scope?: FeedScope
): ContentStream | 'all' {
  if (stream === 'all') return 'all'
  if (isPulseChartsScope(stream, scope)) return 'charts'
  return stream
}

/** Resolved scope for query/UI — undefined on legacy charts stream (redirects). */
export function resolveFeedScope(
  stream: FeedStream,
  rawScope: string | null | undefined
): FeedScope | undefined {
  if (!isScopeEnabledStream(stream)) return undefined
  return parseFeedScope(rawScope)
}

/** Scope for feed queries when `scope` is already parsed. */
export function effectiveFeedScope(
  stream: FeedStream,
  scope?: FeedScope
): FeedScope | undefined {
  if (!isScopeEnabledStream(stream)) return undefined
  const resolved = scope ?? DEFAULT_FEED_SCOPE
  if (resolved === 'charts' && stream !== 'pulse') return DEFAULT_FEED_SCOPE
  return resolved
}

export function getScopeLabel(scope: FeedScope): string {
  if (scope === 'india') return 'India'
  if (scope === 'charts') return 'Charts'
  return 'Global'
}

export function getScopeAriaLabel(scope: FeedScope): string {
  if (scope === 'charts') return 'Charts of the Week'
  return getScopeLabel(scope)
}

function appendScopeParam(
  params: URLSearchParams,
  stream: FeedStream,
  scope?: FeedScope
): void {
  if (scope === 'india' && isScopeEnabledStream(stream)) {
    params.set('scope', 'india')
  } else if (scope === 'charts' && stream === 'pulse') {
    params.set('scope', 'charts')
  }
}

export function buildHomeHref(stream: FeedStream, scope?: FeedScope): string {
  const params = new URLSearchParams()
  if (stream !== DEFAULT_FEED_STREAM) params.set('stream', stream)
  appendScopeParam(params, stream, scope)
  const qs = params.toString()
  return qs ? `/?${qs}` : '/'
}

export function buildChartsScopeHref(): string {
  return '/?stream=pulse&scope=charts'
}

export function buildStreamTabHref(
  targetStream: FeedStream,
  activeScope?: FeedScope
): string {
  if (isScopeDisabledStream(targetStream)) return `/?stream=${targetStream}`
  const scope =
    activeScope === 'india'
      ? 'india'
      : activeScope === 'charts' && targetStream === 'pulse'
        ? 'charts'
        : undefined
  return buildHomeHref(targetStream, scope)
}

/** Deep-link from article content_stream or notification batch row. */
export function buildFeedHrefForContentStream(stream: ContentStream): string {
  if (stream === 'charts') return buildChartsScopeHref()
  return `/?stream=${stream}`
}

/**
 * Legacy `tags=india` bookmarks → `scope=india` with india stripped from tags.
 */
export function normalizeTagsAndScope(
  stream: FeedStream,
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

export function shouldHideIndiaTagSlug(stream: FeedStream): boolean {
  return isScopeEnabledStream(stream)
}

/** Scope tabs shown for the given stream. */
export function getScopesForStream(
  stream: 'all' | 'standard' | 'pulse' | 'tech_vc'
): FeedScope[] {
  if (stream === 'pulse') return ['global', 'india', 'charts']
  return ['global', 'india']
}

type ScopeQueryable = {
  contains(column: string, value: string[]): ScopeQueryable
  not(column: string, operator: string, value: string): ScopeQueryable
}

/** Apply India/Global filter to a Supabase articles query. */
export function applyFeedScopeFilter<T extends ScopeQueryable>(
  query: T,
  stream: FeedStream,
  scope: FeedScope | undefined
): T {
  if (!scope || !isScopeEnabledStream(stream) || scope === 'charts') return query
  if (scope === 'india') {
    return query.contains('tag_slugs', [INDIA_SUBTOPIC_SLUG]) as T
  }
  return query.not('tag_slugs', 'cs', `{${INDIA_SUBTOPIC_SLUG}}`) as T
}

export const VISIBLE_STREAMS_MIGRATION_ERROR_CODES = new Set(['PGRST205', '42P01'])

export function isMissingVisibleStreamsColumnError(
  message: string,
  code?: string | null
): boolean {
  if (code && VISIBLE_STREAMS_MIGRATION_ERROR_CODES.has(code)) return true
  return (
    /visible_streams/i.test(message) &&
    /does not exist|could not find|schema cache|column/i.test(message)
  )
}

export type FeedStreamFilterMode = 'visible_streams' | 'content_stream'

type StreamQueryable = {
  contains(column: string, value: string[]): StreamQueryable
  eq(column: string, value: string): StreamQueryable
}

/** Filter articles visible in the effective feed stream (multi-stream membership). */
export function applyVisibleStreamFilter<T extends StreamQueryable>(
  query: T,
  stream: ContentStream
): T {
  return query.contains('visible_streams', [stream]) as T
}

/** Legacy primary-stream filter — used when visible_streams migration is pending. */
export function applyContentStreamFilter<T extends StreamQueryable>(
  query: T,
  stream: ContentStream
): T {
  return query.eq('content_stream', stream) as T
}

/** Apply stream visibility filter using the selected mode. */
export function applyFeedStreamFilter<T extends StreamQueryable>(
  query: T,
  stream: ContentStream,
  mode: FeedStreamFilterMode = 'visible_streams'
): T {
  if (mode === 'content_stream') {
    return applyContentStreamFilter(query, stream)
  }
  return applyVisibleStreamFilter(query, stream)
}

/** Scope param for search RPC — null when scope does not apply or is charts. */
export function scopeToRpcParam(
  stream: FeedStream,
  scope: FeedScope | undefined
): string | null {
  if (!scope || !isScopeEnabledStream(stream) || scope === 'charts') return null
  return scope
}
