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
    title: 'Nuggets | Curated insights across markets, macros, AI, tech & geopolitics',
    tagline: 'Distilling high-signal intelligence into digestible insights.',
    mobileSummary:
      'Curated insights across markets, macros, AI, tech & geopolitics',
  },
  pulse: {
    label: 'Market Pulse',
    shortLabel: 'Pulse',
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
}

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
  description: `${STREAM_INTRO_COPY.standard.tagline} Browse Nuggets, Market Pulse, and Charts of the Week.`,
  ogDescription: STREAM_INTRO_COPY.standard.mobileSummary,
} as const
