'use client'

import { useQueryState } from 'nuqs'
import { useTransition } from 'react'
import type { ContentStream } from '@/types/article'

const STREAMS: { value: ContentStream; label: string }[] = [
  { value: 'standard', label: 'Nuggets' },
  { value: 'pulse', label: 'Market Pulse' },
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
    <div
      role="tablist"
      aria-label="Content stream"
      className="inline-flex min-h-[44px] items-center rounded-xl border border-border bg-surface p-1"
    >
      {STREAMS.map(({ value, label }) => {
        const selected = stream === value
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                setStream(value)
                setTags(null)
                setQ(null)
              })
            }}
            className={`min-h-[44px] shrink-0 rounded-lg px-4 text-sm font-semibold tracking-tight outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus/60 ${
              selected
                ? 'bg-accent/20 text-primary shadow-sm'
                : 'text-muted hover:bg-surface-raised hover:text-primary'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
