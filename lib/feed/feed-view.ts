export type FeedView = 'grid' | 'skim'

export const FEED_VIEW_STORAGE_KEY = 'nuggets-feed-view-mobile'

export function parseFeedView(raw: string | undefined | null): FeedView {
  return raw === 'skim' ? 'skim' : 'grid'
}

export function isSkimFeedView(raw: string | undefined | null): boolean {
  return parseFeedView(raw) === 'skim'
}
