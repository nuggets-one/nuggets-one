import Link from 'next/link'
import { listLegalPagesAdmin } from '@/lib/queries/legal-pages-admin'
import { reorderLegalPageAction, updateLegalPageRowFlagsAction } from '@/lib/actions/legal-pages'
import { LegalPagesListMobile } from '@/app/admin/legal-pages/_components/legal-pages-list-mobile'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdminLegalPagesListPage() {
  const rows = await listLegalPagesAdmin()

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Legal pages</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Manage Terms, Privacy, and other legal documents. Public URLs are always{' '}
            <code className="rounded bg-surface-raised px-1">/legal/[slug]</code>.
          </p>
        </div>
        <Link
          href="/admin/legal-pages/new"
          className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          New page
        </Link>
      </div>

      {rows.length === 0 && (
        <div className="rounded-xl border border-border bg-surface-raised px-4 py-6 text-sm text-muted">
          No rows returned. If the database migration has not been applied yet, run{' '}
          <code className="rounded bg-bg px-1">20240001000011_legal_pages_cms.sql</code> against Supabase, then refresh.
        </div>
      )}

      {rows.length > 0 && (
        <>
          <LegalPagesListMobile rows={rows} />
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Page</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-primary">{row.page_title?.trim() || row.label}</div>
                    <div className="text-xs text-muted">/legal/{row.slug}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <form action={updateLegalPageRowFlagsAction} className="space-y-2">
                      <input type="hidden" name="slug" value={row.slug} />
                      <label className="flex items-center gap-2 text-xs text-primary">
                        <input type="checkbox" name="is_enabled" defaultChecked={row.is_enabled} className="rounded border-border" />
                        Enabled
                      </label>
                      <label className="flex items-center gap-2 text-xs text-primary">
                        <input type="checkbox" name="show_in_footer" defaultChecked={row.show_in_footer} className="rounded border-border" />
                        Footer
                      </label>
                      <label className="flex items-center gap-2 text-xs text-primary">
                        <input
                          type="checkbox"
                          name="show_in_account_menu"
                          defaultChecked={row.show_in_account_menu}
                          className="rounded border-border"
                        />
                        Account menu
                      </label>
                      <label className="flex items-center gap-2 text-xs text-primary">
                        <input type="checkbox" name="robots_index" defaultChecked={row.robots_index} className="rounded border-border" />
                        Indexable
                      </label>
                      <button
                        type="submit"
                        className="mt-1 rounded-lg border border-border bg-bg px-2 py-1 text-xs font-medium text-primary hover:border-border-strong"
                      >
                        Apply flags
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 align-top text-muted">{formatDate(row.updated_at)}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-1">
                      <form action={reorderLegalPageAction.bind(null, row.slug, 'up')}>
                        <button
                          type="submit"
                          disabled={index === 0}
                          className="w-full rounded-lg border border-border px-2 py-1 text-xs font-medium text-primary disabled:opacity-40"
                        >
                          Move up
                        </button>
                      </form>
                      <form action={reorderLegalPageAction.bind(null, row.slug, 'down')}>
                        <button
                          type="submit"
                          disabled={index === rows.length - 1}
                          className="w-full rounded-lg border border-border px-2 py-1 text-xs font-medium text-primary disabled:opacity-40"
                        >
                          Move down
                        </button>
                      </form>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/admin/legal-pages/${row.slug}`}
                        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-primary hover:border-border-strong"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/legal/${row.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-muted hover:text-primary"
                      >
                        View
                      </Link>
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
