import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getCollectionDetailShell,
  listCollectionArticlesWindow,
  getCollectionMeta,
  resolveCollectionPublicId,
  isCollectionPublicId,
} from '@/lib/queries/collections'
import { CollectionCard } from '@/components/collections/collection-card'
import { CollectionSubtopicIndex } from '@/components/collections/collection-subtopic-index'
import { getBookmarkedArticleIdsForUser } from '@/lib/queries/bookmarks'
import { createClient } from '@/lib/supabase/server'
import { ArticleCard } from '@/components/ui/article-card'
import { CollectionDetailSkeleton } from '@/components/collections/collection-detail-skeleton'
import { StatusBlock } from '@/components/ui/status-block'

// Public route; rendered at request time so builds do not depend on live Supabase schema state.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const COLLECTIONS_CURSOR_PARAM = 'n_cursor'

function readCursorParam(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: rawId } = await params
  const id = await resolveCollectionPublicId(rawId)
  if (!id) {
    return { title: 'Collection not found' }
  }
  const meta = await getCollectionMeta(id)

  if (!meta) {
    return { title: 'Collection not found' }
  }

  return {
    title: meta.title,
    description: meta.description ?? undefined,
  }
}

async function CollectionContent({
  rawId,
  cursorToken,
}: {
  rawId: string
  cursorToken: string | null
}) {
  const resolvedId = await resolveCollectionPublicId(rawId)
  if (!resolvedId || !isCollectionPublicId(resolvedId)) {
    notFound()
  }

  let collection: Awaited<ReturnType<typeof getCollectionDetailShell>>
  let articlesWindow: Awaited<ReturnType<typeof listCollectionArticlesWindow>>
  try {
    ;[collection, articlesWindow] = await Promise.all([
      getCollectionDetailShell(resolvedId),
      listCollectionArticlesWindow(resolvedId, cursorToken),
    ])
  } catch {
    return (
      <StatusBlock
        heading="This collection is unavailable right now."
        body="Please try again shortly."
        linkHref="/collections"
        linkLabel="Back to collections"
      />
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthenticated = !!user
  const isAdmin = user?.app_metadata?.is_admin === true
  const collectionArticleIds = articlesWindow.articles.map((a) => a.id)
  const bookmarkedIds =
    user && collectionArticleIds.length > 0
      ? await getBookmarkedArticleIdsForUser(user.id, collectionArticleIds)
      : new Set<string>()

  const isParentTopic = collection.children.length > 0

  return (
    <>
      <nav className="mb-4 text-sm text-muted">
        <Link href="/collections" className="hover:text-primary hover:underline">
          Collections
        </Link>
        {collection.parent && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/collections/${collection.parent.id}`}
              className="hover:text-primary hover:underline"
            >
              {collection.parent.title}
            </Link>
          </>
        )}
      </nav>

      <div className="mb-8 rounded-2xl border border-border bg-surface p-4 md:p-5">
        <h1 className="text-2xl font-bold text-primary leading-tight md:text-3xl">{collection.title}</h1>
        {collection.description && (
          <p className="mt-2 text-sm text-muted leading-relaxed md:text-base">{collection.description}</p>
        )}
        <p className="mt-3 text-sm text-muted">
          Curated by{' '}
          <span className="font-medium text-primary">{collection.curator_name}</span>
          {isParentTopic && collection.child_count > 0 && (
            <>
              {' '}
              · {collection.child_count}{' '}
              {collection.child_count === 1 ? 'sub-topic' : 'sub-topics'}
            </>
          )}
        </p>
      </div>

      {isParentTopic && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-primary">Sub-collections</h2>
          <CollectionSubtopicIndex subtopics={collection.children} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {collection.children.map((child) => (
              <CollectionCard key={child.id} collection={child} variant="child" />
            ))}
          </div>
        </section>
      )}

      {articlesWindow.articles.length > 0 && (
        <section>
          {isParentTopic && (
            <h2 className="mb-4 text-lg font-semibold text-primary">
              Nuggets in this topic
              {collection.direct_entry_count > 0 && (
                <span className="ml-2 font-normal text-muted">
                  ({collection.direct_entry_count})
                </span>
              )}
            </h2>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
              {articlesWindow.articles.map((article, index) => (
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
            {articlesWindow.next_cursor && (
              <div className="flex justify-center">
                <Link
                  scroll={false}
                  href={{
                    pathname: `/collections/${resolvedId}`,
                    query: {
                      [COLLECTIONS_CURSOR_PARAM]: articlesWindow.next_cursor,
                    },
                  }}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-1"
                >
                  Load more nuggets
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {articlesWindow.articles.length === 0 && !isParentTopic && (
        <StatusBlock
          heading="No nuggets in this collection yet."
          linkHref="/collections"
          linkLabel="Browse all collections"
        />
      )}

      {articlesWindow.articles.length === 0 && isParentTopic && (
        <p className="text-sm text-muted">
          Pick a sub-topic above to browse its nuggets.
        </p>
      )}
    </>
  )
}

export default async function CollectionDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const cursorToken = readCursorParam(resolvedSearchParams[COLLECTIONS_CURSOR_PARAM])

  return (
    <Suspense fallback={<CollectionDetailSkeleton />}>
      <CollectionContent rawId={id} cursorToken={cursorToken} />
    </Suspense>
  )
}
