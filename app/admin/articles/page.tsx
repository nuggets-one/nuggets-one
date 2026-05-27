import 'server-only'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { DeleteArticleButton } from '@/app/admin/articles/_components/DeleteArticleButton'
import { StatusBlock } from '@/components/ui/status-block'
import {
  addCollectionEntriesFromArticlesAction,
  addCollectionEntryAction,
} from '@/lib/actions/collections'
import ArticlesBulkAdd from '@/app/admin/articles/_components/ArticlesBulkAdd'
import {
  ADMIN_ARTICLES_PAGE_SIZE,
  listAdminArticlesPage,
} from '@/lib/queries/articles-admin'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstString(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined
}

function parsePageParam(value: string | undefined): number {
  if (!value || !/^[0-9]+$/.test(value)) return 1
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1
}

function toUrlSearchParams(
  resolved: Record<string, string | string[] | undefined>
): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === 'string') params.set(key, value)
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item)
    }
  }
  return params
}

function buildAdminArticlesHref(baseParams: URLSearchParams, targetPage: number): string {
  const params = new URLSearchParams(baseParams.toString())
  if (targetPage <= 1) {
    params.delete('page')
  } else {
    params.set('page', String(targetPage))
  }
  const query = params.toString()
  return query.length > 0 ? `/admin/articles?${query}` : '/admin/articles'
}

export default async function AdminArticlesPage({ searchParams }: Props) {
  const resolved = (await searchParams) ?? {}
  const requestedPage = parsePageParam(firstString(resolved.page))

  const errorKey = typeof resolved.error === 'string' ? resolved.error : undefined
  const successKey =
    typeof resolved.success === 'string' ? resolved.success : undefined

  const bulkAdded = resolved.bulk_added === '1'
  const added =
    typeof resolved.added === 'string' && /^[0-9]+$/.test(resolved.added)
      ? Number(resolved.added)
      : 0
  const skipped =
    typeof resolved.skipped === 'string' && /^[0-9]+$/.test(resolved.skipped)
      ? Number(resolved.skipped)
      : 0

  const alert = (() => {
    if (errorKey) {
      const msg =
        errorKey === 'already_in_collection'
          ? 'That nugget is already in the selected community collection.'
          : errorKey === 'not_published'
            ? 'Only published nuggets can be added to community collections.'
            : errorKey === 'bulk_lookup_failed'
              ? 'Bulk add failed while looking up articles.'
              : errorKey === 'bulk_insert_failed'
                ? 'Bulk add failed while saving collection entries.'
                : errorKey
      return (
        <div className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg">
          {msg}
        </div>
      )
    }

    if (successKey === 'added_to_collection') {
      return (
        <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-primary">
          Nugget added to community collection.
        </div>
      )
    }

    if (bulkAdded) {
      return (
        <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-primary">
          Bulk add complete: added {added}, skipped {skipped}.
        </div>
      )
    }

    return null
  })()

  const db = createAdminClient()

  const adminArticlesPage = await listAdminArticlesPage({
    page: requestedPage,
    pageSize: ADMIN_ARTICLES_PAGE_SIZE,
  })
  const articleRows = adminArticlesPage.rows
  const articleIds = articleRows.map((a) => a.id)

  const { data: publishedCollections } = await db
    .from('community_collections')
    .select('id, title')
    .eq('status', 'published')
    .order('title', { ascending: true })

  const publishedCollectionRows = publishedCollections ?? []
  const publishedCollectionIds = publishedCollectionRows.map((c) => c.id as string)

  // Used to disable dropdown options for collections this article already belongs to.
  const membershipByArticleId = new Map<string, Set<string>>()
  if (publishedCollectionIds.length > 0 && articleIds.length > 0) {
    const { data: entryRows } = await db
      .from('community_collection_entries')
      .select('article_id, collection_id')
      .in('article_id', articleIds)
      .in('collection_id', publishedCollectionIds)

    for (const row of entryRows ?? []) {
      const articleId = row.article_id as string
      const collectionId = row.collection_id as string
      const set = membershipByArticleId.get(articleId) ?? new Set<string>()
      set.add(collectionId)
      membershipByArticleId.set(articleId, set)
    }
  }

  const baseParams = toUrlSearchParams(resolved)
  const prevHref = buildAdminArticlesHref(baseParams, adminArticlesPage.page - 1)
  const nextHref = buildAdminArticlesHref(baseParams, adminArticlesPage.page + 1)
  const returnToCurrentPage =
    adminArticlesPage.page > 1 ? `/admin/articles?page=${adminArticlesPage.page}` : '/admin/articles'
  const rangeStart =
    adminArticlesPage.totalCount === 0
      ? 0
      : (adminArticlesPage.page - 1) * adminArticlesPage.pageSize + 1
  const rangeEnd = Math.min(
    adminArticlesPage.totalCount,
    adminArticlesPage.page * adminArticlesPage.pageSize
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Articles</h1>
        <Link
          href="/admin/articles/new"
          className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          Create nugget
        </Link>
      </div>

      {alert}

      <ArticlesBulkAdd
        collections={publishedCollectionRows.map((c) => ({
          id: c.id as string,
          title: c.title as string,
        }))}
        addAction={addCollectionEntriesFromArticlesAction}
      />

      {articleRows.length === 0 ? (
        <StatusBlock
          heading="No articles yet"
          body="Create your first nugget to populate this list."
          linkHref="/admin/articles/new"
          linkLabel="Create nugget"
        />
      ) : (
        <>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-raised border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted w-10" />
                  <th className="px-4 py-3 text-left font-medium text-muted">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Stream</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Published</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">
                    Community collections
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {articleRows.map((a) => {
                  const articleId = a.id
                  const alreadyIn = membershipByArticleId.get(articleId) ?? new Set<string>()
                  const firstAvailableCollectionId =
                    a.status === 'published'
                      ? publishedCollectionRows.find((c) => !alreadyIn.has(c.id as string))?.id
                      : undefined
                  const canAdd =
                    a.status === 'published' && typeof firstAvailableCollectionId === 'string'

                  return (
                    <tr key={articleId} className="hover:bg-surface-raised transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          data-articles-bulk-checkbox
                          data-articles-bulk-article-id={articleId}
                          disabled={a.status !== 'published'}
                          aria-label={`Select ${a.title} for bulk add`}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-primary max-w-xs truncate">
                        {a.title}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {a.content_stream === 'pulse' ? 'Market Pulse' : 'Nuggets'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            a.status === 'published'
                              ? 'border border-success-border bg-success-soft text-success-fg'
                              : 'border border-border bg-surface-raised text-muted'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">
                        {a.published_at ? new Date(a.published_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <form action={addCollectionEntryAction} className="flex items-center gap-2">
                          <input type="hidden" name="article_id" value={articleId} />
                          <input type="hidden" name="return_to" value={returnToCurrentPage} />

                          <select
                            name="collection_id"
                            defaultValue={firstAvailableCollectionId ?? ''}
                            disabled={!canAdd}
                            className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-primary max-w-[180px]"
                          >
                            <option value="" disabled>
                              Select…
                            </option>
                            {publishedCollectionRows.map((c) => {
                              const collectionId = c.id as string
                              const disabled = alreadyIn.has(collectionId)
                              return (
                                <option key={collectionId} value={collectionId} disabled={disabled}>
                                  {c.title as string}
                                </option>
                              )
                            })}
                          </select>

                          <button
                            type="submit"
                            disabled={!canAdd}
                            className="rounded-lg bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground disabled:opacity-40"
                          >
                            Add
                          </button>
                        </form>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/articles/${articleId}`}
                            className="text-sm text-primary underline underline-offset-2"
                          >
                            Edit
                          </Link>
                          <DeleteArticleButton id={articleId} variant="compact" />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm">
            <p className="text-muted">
              Showing {rangeStart}-{rangeEnd} of {adminArticlesPage.totalCount} articles
            </p>
            <div className="flex items-center gap-2">
              <span className="text-muted">
                Page {adminArticlesPage.page} of {adminArticlesPage.totalPages}
              </span>
              {adminArticlesPage.hasPrev ? (
                <Link
                  href={prevHref}
                  className="rounded-md border border-border px-3 py-1 font-medium text-primary hover:bg-bg"
                >
                  Previous
                </Link>
              ) : (
                <span className="rounded-md border border-border px-3 py-1 text-muted">Previous</span>
              )}
              {adminArticlesPage.hasNext ? (
                <Link
                  href={nextHref}
                  className="rounded-md border border-border px-3 py-1 font-medium text-primary hover:bg-bg"
                >
                  Next
                </Link>
              ) : (
                <span className="rounded-md border border-border px-3 py-1 text-muted">Next</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
