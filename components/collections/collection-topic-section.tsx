import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import type { CollectionTopicGroup } from '@/types/collection'

type Props = {
  group: CollectionTopicGroup
}

export function CollectionTopicSection({ group }: Props) {
  const { parent, children } = group

  return (
    <section className="rounded-2xl border border-border bg-surface">
      <details className="group">
        <summary className="list-none cursor-pointer p-3 md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-semibold tracking-tight text-primary md:text-lg">
                  {parent.title}
                </h2>
                <span className="text-xs tabular-nums text-muted">{parent.aggregate_entry_count}</span>
              </div>
              {parent.description && (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted">{parent.description}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-muted">
                {parent.child_count} sub-collections
              </span>
              <ChevronDown
                className="h-4 w-4 text-muted transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </div>
          </div>
        </summary>

        <div className="border-t border-border px-3 pb-3 pt-2 md:px-4 md:pb-4">
          {children.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/collections/${child.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs text-primary transition-colors hover:bg-surface hover:text-accent"
                  >
                    <span className="max-w-[220px] truncate">{child.title}</span>
                    <span className="tabular-nums text-[11px] text-muted">{child.entry_count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No sub-collections in this parent yet.</p>
          )}

          <div className="mt-2">
            <Link
              href={`/collections/${parent.id}`}
              className="text-xs font-medium text-accent hover:underline"
            >
              Browse all in {parent.title}
            </Link>
          </div>
        </div>
      </details>
    </section>
  )
}
