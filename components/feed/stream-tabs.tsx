'use client'

import { useQueryState } from 'nuqs'
import { useTransition } from 'react'
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
  const [, setTags] = useQueryState('tags', { shallow: false })
  const [, setQ] = useQueryState('q', { shallow: false })
  const [isPending, startTransition] = useTransition()

  return (
    <div role="tablist" aria-label="Content stream" className="flex gap-1 p-1 bg-surface-raised rounded-lg w-fit">
      {STREAMS.map(({ value, label }) => (
        <button
          key={value}
          role="tab"
          aria-selected={stream === value}
          disabled={isPending}
          onClick={() => {
            startTransition(() => {
              setStream(value)
              setTags(null)
              setQ(null)
            })
          }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
            stream === value
              ? 'bg-surface text-primary shadow-sm active:bg-surface'
              : 'text-muted hover:text-primary active:bg-surface/70'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
