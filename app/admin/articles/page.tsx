import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { AdminArticlesAlerts } from '@/app/admin/articles/_components/admin-articles-alerts'
import { ArticlesBulkBar } from '@/app/admin/articles/_components/articles-bulk-bar'
import { ArticlesListHeader } from '@/app/admin/articles/_components/articles-list-header'
import { ArticlesListMobile } from '@/app/admin/articles/_components/articles-list-mobile'
import { ArticlesListPagination } from '@/app/admin/articles/_components/articles-list-pagination'
import {
  ArticlesListToolbar,
  buildReturnToHref,
} from '@/app/admin/articles/_components/articles-list-toolbar'
import { ArticlesTableDesktop } from '@/app/admin/articles/_components/articles-table-desktop'
import {
  firstString,
  parseAdminArticlesFilters,
  parsePageParam,
} from '@/app/admin/articles/_lib/list-url'
import { StatusBlock } from '@/components/ui/status-block'
import { addCollectionEntriesFromArticlesAction } from '@/lib/actions/collections'
import { listAdminArticlesPage } from '@/lib/queries/articles-admin'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminArticlesPage({ searchParams }: Props) {
  const resolved = (await searchParams) ?? {}
  const filters = parseAdminArticlesFilters(resolved)
  const requestedPage = parsePageParam(firstString(resolved.page))

  const errorKey = typeof resolved.error === 'string' ? resolved.error : undefined
  const successKey = typeof resolved.success === 'string' ? resolved.success : undefined
  const bulkAdded = resolved.bulk_added === '1'
  const added =
    typeof resolved.added === 'string' && /^[0-9]+$/.test(resolved.added)
      ? Number(resolved.added)
      : 0
  const skipped =
    typeof resolved.skipped === 'string' && /^[0-9]+$/.test(resolved.skipped)
      ? Number(resolved.skipped)
      : 0

  const adminArticlesPage = await listAdminArticlesPage({
    page: requestedPage,
    ...filters,
  })

  const articleRows = adminArticlesPage.rows
  const articleIds = articleRows.map((a) => a.id)

  const db = createAdminClient()
  const { data: publishedCollections } = await db
    .from('community_collections')
    .select('id, title')
    .eq('status', 'published')
    .order('title', { ascending: true })

  const publishedCollectionRows = publishedCollections ?? []
  const publishedCollectionIds = publishedCollectionRows.map((c) => c.id as string)
  const collections = publishedCollectionRows.map((c) => ({
    id: c.id as string,
    title: c.title as string,
  }))

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

  const returnTo = buildReturnToHref(filters, adminArticlesPage.page)

  return (
    <section>
      <ArticlesListHeader />

      <AdminArticlesAlerts
        errorKey={errorKey}
        successKey={successKey}
        bulkAdded={bulkAdded}
        added={added}
        skipped={skipped}
      />

      <ArticlesListToolbar filters={filters} totalCount={adminArticlesPage.totalCount} />

      <ArticlesBulkBar
        collections={collections}
        addAction={addCollectionEntriesFromArticlesAction}
      />

      {articleRows.length === 0 ? (
        <StatusBlock
          heading="No articles found"
          body="Try adjusting your filters or create a new nugget."
          linkHref="/admin/articles/new"
          linkLabel="Create nugget"
        />
      ) : (
        <>
          <ArticlesTableDesktop
            rows={articleRows}
            collections={collections}
            membershipByArticleId={membershipByArticleId}
            returnTo={returnTo}
          />
          <ArticlesListMobile
            rows={articleRows}
            collections={collections}
            membershipByArticleId={membershipByArticleId}
            returnTo={returnTo}
          />
          <ArticlesListPagination
            filters={filters}
            page={adminArticlesPage.page}
            pageSize={adminArticlesPage.pageSize}
            totalCount={adminArticlesPage.totalCount}
            totalPages={adminArticlesPage.totalPages}
            hasPrev={adminArticlesPage.hasPrev}
            hasNext={adminArticlesPage.hasNext}
          />
        </>
      )}
    </section>
  )
}
