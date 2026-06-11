import type { ContentStream } from '@/types/article'

export type StreamIntroCopy = {
  label: string
  title: string
  tagline: string
  /** One-line summary for mobile compact skim view */
  mobileSummary: string
}

/** Visible intro + SEO — single source of truth for stream messaging on Home. */
export const STREAM_INTRO_COPY: Record<ContentStream, StreamIntroCopy> = {
  standard: {
    label: 'Nuggets',
    title: 'Nuggets | Curated insights across markets, macros, AI, tech & geopolitics',
    tagline: 'Distilling high-signal intelligence into digestible insights.',
    mobileSummary:
      'Curated insights across markets, macros, AI, tech & geopolitics',
  },
  pulse: {
    label: 'Market Pulse',
    title: 'Market Pulse | High-signal updates for investors and operators',
    tagline:
      'Daily stream of high-signal market updates and intelligence. Refreshed every day.',
    mobileSummary:
      'Daily high-signal market updates for investors and operators',
  },
}

export const HOME_METADATA = {
  title: 'Nuggets: The Knowledge App',
  description: `${STREAM_INTRO_COPY.standard.tagline} Browse the Nuggets and Market Pulse streams.`,
  ogDescription: STREAM_INTRO_COPY.standard.mobileSummary,
} as const
