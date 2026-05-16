import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCollectionById, getCollectionMeta } from '@/lib/queries/collections'
import { getBookmarkedArticleIdsForUser } from '@/lib/queries/bookmarks'
import { createClient } from '@/lib/supabase/server'
import { ArticleCard } from '@/components/ui/article-card'
import { CollectionDetailSkeleton } from '@/components/collections/collection-detail-skeleton'
import { StatusBlock } from '@/components/ui/status-block'

// Public route; rendered at request time so builds do not depend on live Supabase schema state.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const meta = await getCollectionMeta(id)

  if (!meta) {
    return { title: 'Collection not found' }
  }

  return {
    title: meta.title,
    description: meta.description ?? undefined,
  }
}

async function CollectionContent({ id }: { id: string }) {
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  if (!looksLikeUuid) {
    notFound()
  }

  let collection: Awaited<ReturnType<typeof getCollectionById>>
  try {
    collection = await getCollectionById(id)
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
  const collectionArticleIds = collection.articles.map((a) => a.id)
  const bookmarkedIds =
    user && collectionArticleIds.length > 0
      ? await getBookmarkedArticleIdsForUser(user.id, collectionArticleIds)
      : new Set<string>()

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary leading-tight">
          {collection.title}
        </h1>
        {collection.description && (
          <p className="mt-2 text-base text-muted leading-relaxed">
            {collection.description}
          </p>
        )}
        <p className="mt-3 text-sm text-muted">
          Curated by{' '}
          <span className="font-medium text-primary">{collection.curator_name}</span>
        </p>
      </div>

      {/* Article grid — same density as main feed (PRODUCT §12) */}
      {collection.articles.length === 0 ? (
        <StatusBlock
          heading="No nuggets in this collection yet."
          linkHref="/collections"
          linkLabel="Browse all collections"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
          {collection.articles.map((article, index) => (
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
      )}
    </>
  )
}

export default async function CollectionDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <Suspense fallback={<CollectionDetailSkeleton />}>
      <CollectionContent id={id} />
    </Suspense>
  )
}
