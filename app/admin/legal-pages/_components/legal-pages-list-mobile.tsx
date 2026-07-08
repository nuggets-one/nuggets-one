import Link from 'next/link'
import type { LegalPageAdminRow } from '@/lib/types/legal-pages'
import { reorderLegalPageAction, updateLegalPageRowFlagsAction } from '@/lib/actions/legal-pages'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function LegalPagesListMobile({ rows }: { rows: LegalPageAdminRow[] }) {
  return (
    <div className="space-y-2 md:hidden">
      {rows.map((row, index) => (
        <article
          key={row.id}
          className="rounded-lg border border-border bg-surface-raised p-3"
        >
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-primary">
              {row.page_title?.trim() || row.label}
            </h2>
            <p className="text-xs text-muted">/legal/{row.slug}</p>
            <p className="mt-1 text-[11px] text-muted">Updated {formatDate(row.updated_at)}</p>
          </div>

          <form action={updateLegalPageRowFlagsAction} className="mb-3 space-y-2 rounded-lg border border-border bg-bg p-3">
            <input type="hidden" name="slug" value={row.slug} />
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Visibility</p>
            <label className="flex min-h-11 items-center gap-2 text-xs text-primary">
              <input type="checkbox" name="is_enabled" defaultChecked={row.is_enabled} className="size-4 rounded border-border" />
              Enabled
            </label>
            <label className="flex min-h-11 items-center gap-2 text-xs text-primary">
              <input type="checkbox" name="show_in_footer" defaultChecked={row.show_in_footer} className="size-4 rounded border-border" />
              Footer
            </label>
            <label className="flex min-h-11 items-center gap-2 text-xs text-primary">
              <input
                type="checkbox"
                name="show_in_account_menu"
                defaultChecked={row.show_in_account_menu}
                className="size-4 rounded border-border"
              />
              Account menu
            </label>
            <label className="flex min-h-11 items-center gap-2 text-xs text-primary">
              <input type="checkbox" name="robots_index" defaultChecked={row.robots_index} className="size-4 rounded border-border" />
              Indexable
            </label>
            <button
              type="submit"
              className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-primary hover:border-border-strong"
            >
              Apply flags
            </button>
          </form>

          <div className="mb-3 flex gap-2">
            <form action={reorderLegalPageAction.bind(null, row.slug, 'up')} className="flex-1">
              <button
                type="submit"
                disabled={index === 0}
                className="min-h-11 w-full rounded-lg border border-border px-2 py-1 text-xs font-medium text-primary disabled:opacity-40"
              >
                Move up
              </button>
            </form>
            <form action={reorderLegalPageAction.bind(null, row.slug, 'down')} className="flex-1">
              <button
                type="submit"
                disabled={index === rows.length - 1}
                className="min-h-11 w-full rounded-lg border border-border px-2 py-1 text-xs font-medium text-primary disabled:opacity-40"
              >
                Move down
              </button>
            </form>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-2">
            <Link
              href={`/admin/legal-pages/${row.slug}`}
              className="min-h-11 inline-flex items-center rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-primary hover:border-border-strong"
            >
              Edit
            </Link>
            <Link
              href={`/legal/${row.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-11 inline-flex items-center rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-muted hover:text-primary"
            >
              View
            </Link>
          </div>
        </article>
      ))}
    </div>
  )
}
