import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getCollectionById, getCollectionMeta } from '@/lib/queries/collections'
import { ArticleCard } from '@/components/ui/article-card'
import { CollectionDetailSkeleton } from '@/components/collections/collection-detail-skeleton'
import { StatusBlock } from '@/components/ui/status-block'

// Moderate revalidate — BLUEPRINT §11 caching table.
// Per-collection revalidateTag('collection:' + id) wired when admin editor ships (PR-14).
export const revalidate = 300

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const meta = await getCollectionMeta(id)

  if (!meta) {
    return { title: 'Collection not found — Nuggets' }
  }

  return {
    title: `${meta.title} — Nuggets`,
    description: meta.description ?? undefined,
  }
}

async function CollectionContent({ id }: { id: string }) {
  const collection = await getCollectionById(id)

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {collection.articles.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              priority={index === 0}
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
