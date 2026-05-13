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
  let collections: Awaited<ReturnType<typeof listCollections>> = []
  try {
    collections = await listCollections()
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Collections</h1>
        <p className="mt-1 text-sm text-muted">Curated reading lists from the Nuggets team</p>
      </div>
      <Suspense fallback={<CollectionListSkeleton count={6} />}>
        <CollectionGrid />
      </Suspense>
    </>
  )
}
