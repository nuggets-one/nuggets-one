import { parseContentStream } from '@/lib/copy/streams'
import {
  isScopeEnabledStream,
  normalizeTagsAndScope,
  type FeedScope,
} from '@/lib/feed/scope'
import { isSkimFeedView } from '@/lib/feed/feed-view'

const MAX_TAGS = 5
const MAX_Q_LENGTH = 200

/** Mirrors feed content identity in app/(main)/page.tsx FeedGrid. */
export function buildFeedContentKey(searchParams: URLSearchParams): string {
  const stream = parseContentStream(searchParams.get('stream') ?? undefined)
  const tagsRaw = searchParams.get('tags') ?? ''
  const parsedTags = tagsRaw
    ? tagsRaw
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0 && tag.length <= 80)
        .slice(0, MAX_TAGS)
    : []
  const q = (searchParams.get('q') ?? '').trim().slice(0, MAX_Q_LENGTH)
  const { tags, scope } = normalizeTagsAndScope(
    stream,
    parsedTags,
    searchParams.get('scope') ?? undefined
  )
  const feedScope: FeedScope | undefined = isScopeEnabledStream(stream)
    ? scope ?? 'global'
    : undefined
  const scopeKey = feedScope ?? 'none'
  const skimView = isSkimFeedView(searchParams.get('view') ?? undefined, null)
  return `${stream}:${scopeKey}:${[...tags].sort().join(',')}:${q}:${skimView ? 'skim' : 'grid'}`
}

export const FEED_CONTENT_VERSION_ATTR = 'data-feed-content-version'

export function readFeedContentVersionFromDom(): string | null {
  if (typeof document === 'undefined') return null
  const el = document.querySelector(`[${FEED_CONTENT_VERSION_ATTR}]`)
  return el?.getAttribute(FEED_CONTENT_VERSION_ATTR) ?? null
}
