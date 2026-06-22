'use client'

import { useQueryState } from 'nuqs'
import Link from 'next/link'
import { StatusBlock } from '@/components/ui/status-block'
import { useFeedPending } from '@/components/feed/feed-pending-context'

type Props = {
  q: string
  hasTags: boolean
  unavailable?: boolean
}

export function FeedEmpty({ q, hasTags, unavailable = false }: Props) {
  const [, setQ] = useQueryState('q', { shallow: false })
  const [, setTags] = useQueryState('tags', { shallow: false })
  const { beginFeedTransition } = useFeedPending()

  if (unavailable) {
    return (
      <StatusBlock heading="Feed temporarily unavailable.">
        <p className="mt-2 text-sm text-muted">
          We could not load articles right now. Please refresh or try again shortly.
        </p>
      </StatusBlock>
    )
  }

  if (q) {
    return (
      <StatusBlock heading={`No nuggets match "${q}".`}>
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={() =>
              beginFeedTransition(() => {
                setQ(null)
              })
            }
            className="text-sm font-medium text-primary underline underline-offset-2"
          >
            Clear search
          </button>
          {hasTags && (
            <button
              onClick={() =>
                beginFeedTransition(() => {
                  setQ(null)
                  setTags(null)
                })
              }
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
          onClick={() =>
            beginFeedTransition(() => {
              setTags(null)
              setQ(null)
            })
          }
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
