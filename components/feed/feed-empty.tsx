'use client'

import { useQueryState } from 'nuqs'
import Link from 'next/link'
import { StatusBlock } from '@/components/ui/status-block'

type Props = {
  q: string
  hasTags: boolean
}

export function FeedEmpty({ q, hasTags }: Props) {
  const [, setQ] = useQueryState('q', { shallow: false })
  const [, setTags] = useQueryState('tags', { shallow: false })

  if (q) {
    return (
      <StatusBlock heading={`No nuggets match "${q}".`}>
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={() => setQ(null)}
            className="text-sm font-medium text-primary underline underline-offset-2"
          >
            Clear search
          </button>
          {hasTags && (
            <button
              onClick={() => { setQ(null); setTags(null) }}
              className="text-sm text-muted underline underline-offset-2"
            >
              Clear all filters
            </button>
          )}
        </div>
      </StatusBlock>
    )
  }

  if (hasTags) {
    return (
      <StatusBlock heading="No nuggets match these filters.">
        <button
          onClick={() => {
            setTags(null)
            setQ(null)
          }}
          className="mt-4 text-sm font-medium text-primary underline underline-offset-2"
        >
          Clear filters
        </button>
        <div className="mt-3">
          <Link href="/" className="text-sm text-muted underline underline-offset-2">
            Back to home
          </Link>
        </div>
      </StatusBlock>
    )
  }

  return <StatusBlock heading="No nuggets yet." />
}
