import type { ContentStream } from '@/types/article'

export type StreamPrefColumn = 'stream_standard' | 'stream_pulse' | 'stream_charts'

export function streamPrefColumn(stream: ContentStream): StreamPrefColumn {
  switch (stream) {
    case 'pulse':
      return 'stream_pulse'
    case 'charts':
      return 'stream_charts'
    default:
      return 'stream_standard'
  }
}
