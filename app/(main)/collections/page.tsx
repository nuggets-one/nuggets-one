import { Suspense } from 'react'
import type { Metadata } from 'next'
import { listCollections } from '@/lib/queries/collections'
import { CollectionCard } from '@/components/collections/collection-card'
import { CollectionListSkeleton } from '@/components/collections/collection-list-skeleton'
import { StatusBlock } from '@/components/ui/status-block'

// Public route; rendered at request time so builds do not depend on live Supabase schema state.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Collections — Nuggets',
  description: 'Curated reading lists from the Nuggets community.',
}

async function CollectionGrid() {
  const collections = await listCollections()

  if (collections.length === 0) {
    return (
      <StatusBlock
        heading="No collections yet."
        body="Collections are editorial lists added over time."
        linkHref="/"
        linkLabel="Browse nuggets"
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {collections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  )
}

export default function CollectionsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-primary mb-6">Collections</h1>
      <Suspense fallback={<CollectionListSkeleton count={6} />}>
        <CollectionGrid />
      </Suspense>
    </>
  )
}
