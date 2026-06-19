import 'server-only'

import Link from 'next/link'
import { TagsListHeader } from '@/app/admin/tags/_components/tags-list-header'
import { TagsListMobile } from '@/app/admin/tags/_components/tags-list-mobile'
import { TagsListToolbar } from '@/app/admin/tags/_components/tags-list-toolbar'
import { TagsTableDesktop } from '@/app/admin/tags/_components/tags-table-desktop'
import {
  parseAdminTagsListFilters,
} from '@/app/admin/tags/_lib/list-url'
import { StatusBlock } from '@/components/ui/status-block'
import { getTagsAdminStats, listTagsAdmin } from '@/lib/queries/tags-admin'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminTagsPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {}
  const filters = parseAdminTagsListFilters(params)

  let stats
  let rows

  try {
    ;[stats, rows] = await Promise.all([
      getTagsAdminStats(),
      listTagsAdmin({
        q: filters.q,
        dimension: filters.dimension,
      }),
    ])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return (
      <StatusBlock
        heading="Could not load tags"
        body={message}
        linkHref="/admin/tags"
        linkLabel="Retry"
      />
    )
  }

  return (
    <section>
      <TagsListHeader stats={stats} />
      <TagsListToolbar filters={filters} totalCount={rows.length} />

      {stats.total === 0 ? (
        <div className="rounded-lg border border-border bg-surface-raised px-3 py-3 text-xs text-muted">
          No tags yet.{' '}
          <Link href="/admin/tags/new" className="font-medium text-accent hover:underline">
            Create your first tag
          </Link>
          .
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-raised px-3 py-3 text-xs text-muted">
          No tags match these filters.{' '}
          <Link href="/admin/tags" className="font-medium text-accent hover:underline">
            Clear filters
          </Link>
          .
        </div>
      ) : (
        <>
          <TagsTableDesktop rows={rows} />
          <TagsListMobile rows={rows} />
        </>
      )}
    </section>
  )
}
