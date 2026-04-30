'use client'

import { useQueryState } from 'nuqs'
import Link from 'next/link'

type Props = {
  q: string
  hasTags: boolean
}

export function FeedEmpty({ q, hasTags }: Props) {
  const [, setQ] = useQueryState('q', { shallow: false })
  const [, setTags] = useQueryState('tags', { shallow: false })

  if (q) {
    return (
      <div className="py-16 text-center">
        <p className="text-base font-semibold text-primary mb-1">
          No nuggets match &ldquo;{q}&rdquo;.
        </p>
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
      </div>
    )
  }

  if (hasTags) {
    return (
      <div className="py-16 text-center">
        <p className="text-base font-semibold text-primary mb-1">
          No nuggets match these filters.
        </p>
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
      </div>
    )
  }

  return (
    <div className="py-16 text-center">
      <p className="text-base font-semibold text-primary">No nuggets yet.</p>
    </div>
  )
}
