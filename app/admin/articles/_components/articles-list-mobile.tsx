import Link from 'next/link'
import { ArticleCollectionCell } from '@/app/admin/articles/_components/article-collection-cell'
import { ArticleRowActions } from '@/app/admin/articles/_components/article-row-actions'
import { ArticleRowThumbnail } from '@/app/admin/articles/_components/article-row-thumbnail'
import { ArticlesBulkCheckbox } from '@/app/admin/articles/_components/articles-select-all'
import { formatAdminArticleDate } from '@/app/admin/articles/_lib/format-date'
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

export function ArticlesListMobile({
  rows,
  collections,
  membershipByArticleId,
  returnTo,
}: Props) {
  return (
    <div className="space-y-2 md:hidden">
      {rows.map((a) => {
        const memberIds = Array.from(membershipByArticleId.get(a.id) ?? [])
        const memberSet = new Set(memberIds)
        const availableCollections = collections.filter((c) => !memberSet.has(c.id))
        const canAdd = a.status === 'published' && availableCollections.length > 0

        return (
          <article
            key={a.id}
            className="rounded-lg border border-border bg-surface-raised p-3"
          >
            <div className="mb-2 flex items-start gap-2.5">
              <ArticlesBulkCheckbox
                articleId={a.id}
                title={a.title}
                disabled={a.status !== 'published'}
              />
              <ArticleRowThumbnail row={a} size="md" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-primary">
                    <Link href={`/admin/articles/${a.id}`} className="hover:text-accent">
                      {a.title}
                    </Link>
                  </h2>
                  <StatusPill status={a.status} />
                </div>
                <p className="text-[11px] tabular-nums text-muted">
                  {getStreamLabel(parseContentStream(a.content_stream), 'short')}
                  <span aria-hidden="true"> · </span>
                  {formatAdminArticleDate(a.published_at)}
                </p>
              </div>
            </div>

            <div className="mb-2">
              <ArticleCollectionCell
                articleId={a.id}
                status={a.status}
                collections={collections}
                memberCollectionIds={memberIds}
                returnTo={returnTo}
                addAction={addCollectionEntryAction}
                layout="stacked"
              />
            </div>

            <div className="flex justify-end border-t border-border pt-2">
              <ArticleRowActions
                articleId={a.id}
                editHref={`/admin/articles/${a.id}`}
                canAddToCollection={canAdd}
                availableCollections={availableCollections}
                returnTo={returnTo}
                addAction={addCollectionEntryAction}
              />
            </div>
          </article>
        )
      })}
    </div>
  )
}
