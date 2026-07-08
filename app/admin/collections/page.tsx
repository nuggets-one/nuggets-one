import Link from 'next/link'
import { listCollectionsAdmin } from '@/lib/queries/collections-admin'
import { DeleteCollectionButton } from '@/app/admin/collections/_components/DeleteCollectionButton'
import { CollectionsListMobile } from '@/app/admin/collections/_components/collections-list-mobile'

export const dynamic = 'force-dynamic'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdminCollectionsPage() {
  const rows = await listCollectionsAdmin()

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Collections</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Community editorial lists shown on{' '}
            <code className="rounded bg-surface-raised px-1">/collections</code>. Only{' '}
            <strong className="font-medium text-primary">published</strong> collections appear on
            the public site.
          </p>
        </div>
        <Link
          href="/admin/collections/new"
          className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          New collection
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised px-4 py-6 text-sm text-muted">
          No collections yet. Create one or run the Mongo ETL migration.
        </div>
      ) : (
        <>
          <CollectionsListMobile rows={rows} />
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Nuggets</th>
                <th className="px-4 py-3">Curator</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-primary">{row.title}</td>
                  <td className="px-4 py-3 text-muted">
                    {row.parent_title ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        row.status === 'published'
                          ? 'inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent'
                          : 'inline-flex rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium text-muted'
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{row.entry_count}</td>
                  <td className="px-4 py-3 text-muted">{row.curator_name}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(row.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <Link
                        href={`/admin/collections/${row.id}`}
                        className="text-sm font-medium text-accent hover:underline"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/collections/${row.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted hover:text-primary hover:underline"
                      >
                        View
                      </Link>
                      <DeleteCollectionButton id={row.id} title={row.title} variant="compact" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  )
}
