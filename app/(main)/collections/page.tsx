import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  listCollections,
  listCollectionTopics,
  listCollectionArticlesWindow,
} from '@/lib/queries/collections'
import { CollectionsToolbar } from '@/components/collections/collections-toolbar'
import { CollectionsBrowseBreadcrumbs } from '@/components/collections/collections-browse-breadcrumbs'
import { CollectionListSkeleton } from '@/components/collections/collection-list-skeleton'
import { SubcollectionPicker } from '@/components/collections/subcollection-picker'
import { StatusBlock } from '@/components/ui/status-block'
import { ArticleCard } from '@/components/ui/article-card'
import {
  COLLECTIONS_CURSOR_PARAM,
  collectionsBrowseHref,
} from '@/lib/collections/browse-params'
import { createClient } from '@/lib/supabase/server'
import { getBookmarkedArticleIdsForUser } from '@/lib/queries/bookmarks'

// Public route; list content is cached for a short window for CWV safety.
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Explore editorial podcast collections by topic, theme, and intent.',
}

type SearchParams = Record<string, string | string[] | undefined>

type Props = {
  searchParams: Promise<SearchParams>
}

function readCursorParam(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function CollectionsExperience({ searchParams }: Props) {
  const resolved = await searchParams
  const q = typeof resolved.q === 'string' ? resolved.q : ''
  const selectedParentParam = typeof resolved.parent === 'string' ? resolved.parent : null
  const selectedSubParam = typeof resolved.sub === 'string' ? resolved.sub : null
  const cursorToken = readCursorParam(resolved[COLLECTIONS_CURSOR_PARAM])

  let browse: Awaited<ReturnType<typeof listCollectionTopics>>
  let parentCollections: Awaited<ReturnType<typeof listCollections>>
  try {
    ;[browse, parentCollections] = await Promise.all([
      listCollectionTopics({ q }),
      listCollections(),
    ])
  } catch {
    return (
      <StatusBlock
        heading="Collections are unavailable right now."
        body="Please try again in a moment."
        linkHref="/collections"
        linkLabel="Retry"
      />
    )
  }

  if (browse.total_parents === 0) {
    return (
      <StatusBlock
        heading="No collections yet."
        body="Collections are editorial lists added over time."
        linkHref="/"
        linkLabel="Browse nuggets"
      />
    )
  }

  const parentOptions = parentCollections.map((parent) => ({
    id: parent.id,
    title: parent.title,
    count: parent.aggregate_entry_count,
  }))

  const selectedGroup = browse.groups.find((group) => group.parent.id === selectedParentParam) ?? null
  const selectedParent = selectedGroup?.parent ?? null
  const selectedSub =
    selectedGroup?.children.find((child) => child.id === selectedSubParam) ?? null
  const selectedCollectionId = selectedSub?.id ?? selectedParent?.id ?? null

  let selectedCollection: Awaited<ReturnType<typeof listCollectionArticlesWindow>> | null = null
  if (selectedCollectionId) {
    try {
      selectedCollection = await listCollectionArticlesWindow(selectedCollectionId, cursorToken)
    } catch {
      selectedCollection = null
    }
  }

  let userId: string | null = null
  let isAdmin = false
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (authUser) {
      userId = authUser.id
      isAdmin = authUser.app_metadata?.is_admin === true
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`collections auth fallback: ${message}`)
  }

  const isAuthenticated = userId !== null
  const selectedArticleIds = selectedCollection?.articles.map((article) => article.id) ?? []
  const bookmarkedIds =
    userId && selectedArticleIds.length > 0
      ? await getBookmarkedArticleIdsForUser(userId, selectedArticleIds)
      : new Set<string>()

  if (browse.groups.length === 0) {
    return (
      <>
        <CollectionsToolbar
          parents={parentOptions}
          currentQuery={q}
          selectedParentId={selectedParent?.id ?? null}
          selectedParentTitle={selectedParent?.title ?? null}
          selectedSubTitle={selectedSub?.title ?? null}
          totalParents={browse.total_parents}
          totalChildren={browse.total_children}
        />
        <StatusBlock
          heading="No matching collections."
          body="Try a broader search or clear filters to continue exploring."
          linkHref="/collections"
          linkLabel="Reset filters"
        />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <CollectionsToolbar
        key={`${q}|${selectedParentParam ?? ''}|${selectedSubParam ?? ''}`}
        parents={parentOptions}
        currentQuery={q}
        selectedParentId={selectedParent?.id ?? null}
        selectedParentTitle={selectedParent?.title ?? null}
        selectedSubTitle={selectedSub?.title ?? null}
        totalParents={browse.total_parents}
        totalChildren={browse.total_children}
      />

      {selectedParent && (
        <CollectionsBrowseBreadcrumbs
          q={q}
          parent={{ id: selectedParent.id, title: selectedParent.title }}
          sub={selectedSub ? { id: selectedSub.id, title: selectedSub.title } : null}
        />
      )}

      <div className="min-h-[52vh] rounded-2xl border border-border bg-surface p-4 md:p-5">
        {!selectedParent && (
          <StatusBlock
            heading="Select a collection to begin."
            body="Choose a parent collection above to browse sub-collections and view nuggets."
          />
        )}

        {selectedParent && (
          <div className="space-y-5">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-primary">{selectedParent.title}</h2>
              <SubcollectionPicker
                parentTitle={selectedParent.title}
                options={selectedGroup?.children ?? []}
                selectedSubId={selectedSub?.id ?? null}
              />
            </section>

            <section>
              {selectedCollection && selectedCollection.articles.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
                    {selectedCollection.articles.map((article, index) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        priority={index === 0}
                        isAuthenticated={isAuthenticated}
                        initialBookmarked={bookmarkedIds.has(article.id)}
                        adminEditHref={isAdmin ? `/admin/articles/${article.id}` : null}
                      />
                    ))}
                  </div>
                  {selectedCollection.next_cursor && (
                    <div className="flex justify-center">
                      <Link
                        scroll={false}
                        href={collectionsBrowseHref({
                          q,
                          parent: selectedParentParam ?? undefined,
                          sub: selectedSubParam ?? undefined,
                          cursor: selectedCollection.next_cursor,
                        })}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1"
                      >
                        Load more nuggets
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <StatusBlock
                  heading="No nuggets in this selection yet."
                  body="Try another sub-collection or switch to a different parent collection."
                />
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CollectionsPage(props: Props) {
  return (
    <Suspense fallback={<CollectionListSkeleton count={3} />}>
      <CollectionsExperience {...props} />
    </Suspense>
  )
}
