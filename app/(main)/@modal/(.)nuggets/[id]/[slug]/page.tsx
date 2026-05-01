import { Suspense } from 'react'
import { ArticleContent } from '@/components/ui/article-content'
import { ArticleDetailSkeleton } from '@/components/ui/article-detail-skeleton'
import { Sheet } from '@/components/ui/sheet'

// Intercepting route — captures feed-originated nav to /nuggets/[id]/[slug]
// and renders the article inside a Sheet without unmounting the underlying
// feed grid. Direct URL hits (paste, share-link) bypass this slot and serve
// the canonical full page. Phase 15 / plan §2.K.
type Props = {
  params: Promise<{ id: string; slug: string }>
}

export default async function NuggetSheet({ params }: Props) {
  const { id, slug } = await params

  return (
    <Sheet ariaLabel="Article">
      <Suspense fallback={<ArticleDetailSkeleton />}>
        <ArticleContent id={id} slug={slug} />
      </Suspense>
    </Sheet>
  )
}
