import type { ContentStream } from '@/types/article'

export type StreamPrefColumn =
  | 'stream_standard'
  | 'stream_pulse'
  | 'stream_charts'
  | 'stream_tech_vc'
  | 'stream_geopolitics'
  | 'stream_leadership'

export function streamPrefColumn(stream: ContentStream): StreamPrefColumn {
  switch (stream) {
    case 'pulse':
      return 'stream_pulse'
    case 'charts':
      return 'stream_charts'
    case 'tech_vc':
      return 'stream_tech_vc'
    case 'geopolitics':
      return 'stream_geopolitics'
    case 'leadership':
      return 'stream_leadership'
    default:
      return 'stream_standard'
  }
}
