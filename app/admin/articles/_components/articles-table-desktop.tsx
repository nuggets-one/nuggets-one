import Link from 'next/link'
import { ArticleCollectionCell } from '@/app/admin/articles/_components/article-collection-cell'
import { ArticleRowActions } from '@/app/admin/articles/_components/article-row-actions'
import { ArticleRowThumbnail } from '@/app/admin/articles/_components/article-row-thumbnail'
import {
  ArticlesBulkCheckbox,
  ArticlesSelectAll,
} from '@/app/admin/articles/_components/articles-select-all'
import {
  formatAdminArticleDate,
  formatAdminArticleDateCompact,
} from '@/app/admin/articles/_lib/format-date'
import { addCollectionEntryAction } from '@/lib/actions/collections'
import { getStreamLabel, parseContentStream } from '@/lib/copy/streams'
import type { AdminArticleRow } from '@/lib/queries/articles-admin'

type CollectionRow = { id: string; title: string }

type Props = {
  rows: AdminArticleRow[]
  collections: CollectionRow[]
  membershipByArticleId: Map<string, Set<string>>
  returnTo: string
}

function StatusPill({ status }: { status: 'draft' | 'published' }) {
  if (status === 'published') {
    return (
      <span
        className="inline-flex rounded-full bg-accent/15 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-accent"
        title="Published"
      >
        pub
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-surface-raised px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-muted">
      draft
    </span>
  )
}

export function ArticlesTableDesktop({
  rows,
  collections,
  membershipByArticleId,
  returnTo,
}: Props) {
  return (
    <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-bg">
      <table className="w-full table-fixed border-separate border-spacing-0 text-left text-xs">
        <colgroup>
          <col className="w-8" />
          <col className="w-14" />
          <col />
          <col className="w-[5.5rem]" />
          <col className="w-[3.25rem]" />
          <col className="w-[5.5rem]" />
          <col className="w-[8.5rem]" />
          <col className="w-[5.5rem]" />
        </colgroup>
        <thead>
          <tr className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            <th className="border-b border-border bg-surface-raised px-2 py-2">
              <ArticlesSelectAll />
            </th>
            <th
              className="border-b border-border bg-surface-raised px-2 py-2"
              aria-label="Hero"
            />
            <th className="border-b border-border bg-surface-raised px-2 py-2">Title</th>
            <th className="border-b border-border bg-surface-raised px-2 py-2">Stream</th>
            <th className="border-b border-border bg-surface-raised px-2 py-2">Status</th>
            <th className="border-b border-border bg-surface-raised px-2 py-2">Published</th>
            <th className="border-b border-border bg-surface-raised px-2 py-2">Collections</th>
            <th className="border-b border-border bg-surface-raised px-2 py-2 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-bg">
          {rows.map((a) => {
            const memberIds = Array.from(membershipByArticleId.get(a.id) ?? [])
            const memberSet = new Set(memberIds)
            const availableCollections = collections.filter((c) => !memberSet.has(c.id))
            const canAdd = a.status === 'published' && availableCollections.length > 0
            const stream = parseContentStream(a.content_stream)

            return (
              <tr
                key={a.id}
                className="border-b border-border bg-bg last:border-0 transition-colors hover:bg-surface-raised/70"
              >
                <td className="px-2 py-1.5 align-middle">
                  <ArticlesBulkCheckbox
                    articleId={a.id}
                    title={a.title}
                    disabled={a.status !== 'published'}
                  />
                </td>
                <td className="overflow-hidden px-2 py-1.5 align-middle">
                  <ArticleRowThumbnail row={a} />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <Link
                    href={`/admin/articles/${a.id}`}
                    className="line-clamp-2 text-sm font-medium leading-snug text-primary hover:text-accent"
                    title={a.title}
                  >
                    {a.title}
                  </Link>
                </td>
                <td className="truncate px-2 py-1.5 align-middle text-muted" title={getStreamLabel(stream)}>
                  {getStreamLabel(stream, 'short')}
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <StatusPill status={a.status} />
                </td>
                <td
                  className="whitespace-nowrap px-2 py-1.5 align-middle tabular-nums text-muted"
                  title={a.published_at ? formatAdminArticleDate(a.published_at) : undefined}
                >
                  {formatAdminArticleDateCompact(a.published_at)}
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <ArticleCollectionCell
                    articleId={a.id}
                    status={a.status}
                    collections={collections}
                    memberCollectionIds={memberIds}
                    returnTo={returnTo}
                    addAction={addCollectionEntryAction}
                    dense
                  />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <ArticleRowActions
                    articleId={a.id}
                    editHref={`/admin/articles/${a.id}`}
                    canAddToCollection={canAdd}
                    availableCollections={availableCollections}
                    returnTo={returnTo}
                    addAction={addCollectionEntryAction}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
