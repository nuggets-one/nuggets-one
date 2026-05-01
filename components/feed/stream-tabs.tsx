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
      className="flex min-h-[48px] items-end gap-1 overflow-x-auto sm:gap-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
            className={`-mb-[1px] shrink-0 border-b-2 pb-3 pt-2 text-sm font-semibold tracking-tight outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus/60 min-h-[44px] px-4 sm:px-5 ${
              selected
                ? 'border-accent text-primary'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
