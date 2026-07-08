import Link from 'next/link'
import type { CollectionAdminRow } from '@/lib/queries/collections-admin'
import { DeleteCollectionButton } from '@/app/admin/collections/_components/DeleteCollectionButton'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusPill({ status }: { status: 'draft' | 'published' }) {
  if (status === 'published') {
    return (
      <span className="inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
        published
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
      draft
    </span>
  )
}

export function CollectionsListMobile({ rows }: { rows: CollectionAdminRow[] }) {
  return (
    <div className="space-y-2 md:hidden">
      {rows.map((row) => (
        <article
          key={row.id}
          className="rounded-lg border border-border bg-surface-raised p-3"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold leading-snug text-primary">
                <Link href={`/admin/collections/${row.id}`} className="hover:text-accent">
                  {row.title}
                </Link>
              </h2>
              {row.parent_title ? (
                <p className="mt-0.5 text-[11px] text-muted">Parent: {row.parent_title}</p>
              ) : null}
            </div>
            <StatusPill status={row.status} />
          </div>

          <dl className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted">
            <div>
              <dt className="font-medium text-primary">Nuggets</dt>
              <dd>{row.entry_count}</dd>
            </div>
            <div>
              <dt className="font-medium text-primary">Curator</dt>
              <dd className="truncate">{row.curator_name}</dd>
            </div>
            <div className="col-span-2">
              <dt className="font-medium text-primary">Updated</dt>
              <dd>{formatDate(row.updated_at)}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-2">
            <Link
              href={`/admin/collections/${row.id}`}
              className="min-h-11 inline-flex items-center text-sm font-medium text-accent hover:underline"
            >
              Edit
            </Link>
            <Link
              href={`/collections/${row.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-11 inline-flex items-center text-sm text-muted hover:text-primary hover:underline"
            >
              View
            </Link>
            <DeleteCollectionButton id={row.id} title={row.title} variant="compact" />
          </div>
        </article>
      ))}
    </div>
  )
}
