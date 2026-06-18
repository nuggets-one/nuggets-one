import { CONTENT_STREAMS, DEFAULT_STREAM, type ContentStream } from '@/types/article'

export type StreamIntroCopy = {
  label: string
  /** Short label for cramped chrome (tabs, bottom nav). */
  shortLabel: string
  title: string
  tagline: string
  /** One-line summary for mobile compact skim view */
  mobileSummary: string
}

/** Visible intro + SEO — single source of truth for stream messaging on Home. */
export const STREAM_INTRO_COPY: Record<ContentStream, StreamIntroCopy> = {
  standard: {
    label: 'Nuggets',
    shortLabel: 'Nuggets',
    title: 'Nuggets | Curated insights across markets, macros, history & more',
    tagline: 'Distilling high-signal intelligence into digestible insights.',
    mobileSummary:
      'Curated insights across markets, macros, history, and intelligence',
  },
  pulse: {
    label: 'Market Pulse',
    shortLabel: 'Markets',
    title: 'Market Pulse | High-signal updates for investors and operators',
    tagline:
      'Daily stream of high-signal market updates and intelligence. Refreshed every day.',
    mobileSummary:
      'Daily high-signal market updates for investors and operators',
  },
  charts: {
    label: 'Charts of the Week',
    shortLabel: 'Charts',
    title: 'Charts of the Week | Curated charts from top finance & news firms',
    tagline: "The week's best data visuals — updated daily.",
    mobileSummary: 'Curated charts from top finance and news firms',
  },
  tech_vc: {
    label: 'Tech x VC',
    shortLabel: 'Tech',
    title: 'Tech x VC | Technology, AI, semiconductors & venture capital',
    tagline:
      'Technology, AI, semiconductors, and venture capital — curated for builders and investors.',
    mobileSummary:
      'Technology, AI, semiconductors, and venture capital for builders and investors',
  },
  geopolitics: {
    label: 'Geopolitics',
    shortLabel: 'Geo',
    title: 'Geopolitics | Global power, conflict & policy',
    tagline: 'Global power, conflict, and policy — the stories reshaping the world order.',
    mobileSummary: 'Global power, conflict, and policy intelligence',
  },
}

/** Display order for stream navigation (feed tabs, bottom nav). */
export const STREAM_NAV_ORDER = [
  'pulse',
  'tech_vc',
  'standard',
  'charts',
  'geopolitics',
] as const satisfies readonly ContentStream[]

export type StreamLabelVariant = 'full' | 'short'

export function getStreamLabel(
  stream: ContentStream,
  variant: StreamLabelVariant = 'full',
): string {
  const copy = STREAM_INTRO_COPY[stream]
  return variant === 'short' ? copy.shortLabel : copy.label
}

/** Push notification title for a newly published article. */
export function pushNotificationTitle(stream: ContentStream): string {
  if (stream === 'standard') return 'New Nugget'
  return getStreamLabel(stream)
}

export function parseContentStream(raw: string | null | undefined): ContentStream {
  if (raw && (CONTENT_STREAMS as readonly string[]).includes(raw)) {
    return raw as ContentStream
  }
  return DEFAULT_STREAM
}

export const HOME_METADATA = {
  title: 'Nuggets: The Knowledge App',
  description: `${STREAM_INTRO_COPY.standard.tagline} Browse Nuggets, Market Pulse, Charts of the Week, Tech x VC, and Geopolitics.`,
  ogDescription: STREAM_INTRO_COPY.standard.mobileSummary,
} as const
