'use client'

import { useQueryState } from 'nuqs'
import type { ContentStream } from '@/types/article'

const STREAMS: { value: ContentStream; label: string }[] = [
  { value: 'standard', label: 'Nuggets' },
  { value: 'pulse',    label: 'Market Pulse' },
]

export function StreamTabs() {
  const [stream, setStream] = useQueryState<ContentStream>('stream', {
    defaultValue: 'standard',
    parse: (v): ContentStream => (v === 'pulse' ? 'pulse' : 'standard'),
    shallow: false,
  })

  return (
    <div role="tablist" aria-label="Content stream" className="flex gap-1 p-1 bg-surface-raised rounded-lg w-fit">
      {STREAMS.map(({ value, label }) => (
        <button
          key={value}
          role="tab"
          aria-selected={stream === value}
          onClick={() => setStream(value)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
            stream === value
              ? 'bg-surface text-primary shadow-sm'
              : 'text-muted hover:text-primary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
