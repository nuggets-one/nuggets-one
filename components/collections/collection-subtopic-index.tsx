import Link from 'next/link'
import type { CollectionSummary } from '@/types/collection'

type Props = {
  subtopics: CollectionSummary[]
}

/** Server-only compact jump list for parent collection pages (Plan C). */
export function CollectionSubtopicIndex({ subtopics }: Props) {
  if (subtopics.length < 6) return null

  const sorted = [...subtopics].sort((a, b) => a.title.localeCompare(b.title))

  return (
    <nav aria-label="Sub-topics A–Z" className="mb-6 rounded-xl border border-border bg-surface-raised px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Jump to sub-topic (A–Z)
      </p>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((child) => (
          <li key={child.id} className="min-w-0">
            <Link
              href={`/collections/${child.id}`}
              className="group inline-flex max-w-full items-baseline gap-1.5 text-sm text-primary hover:text-accent hover:underline"
            >
              <span className="truncate">{child.title}</span>
              {child.direct_entry_count > 0 && (
                <span className="shrink-0 tabular-nums text-xs text-muted group-hover:text-accent/80">
                  {child.direct_entry_count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
