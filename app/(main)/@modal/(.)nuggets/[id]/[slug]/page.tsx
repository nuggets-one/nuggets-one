import { Suspense } from 'react'
import { notFound, permanentRedirect } from 'next/navigation'
import { ArticleContent } from '@/components/ui/article-content'
import { ArticleDetailSkeleton } from '@/components/ui/article-detail-skeleton'
import { Sheet } from '@/components/ui/sheet'
import { getCanonicalArticleSlug } from '@/lib/queries/article'

// Intercepted nugget detail route shell — captures feed-originated nav to
// /nuggets/[id]/[slug] and renders the canonical route inside an in-context
// sheet without unmounting the underlying grid. Direct URL hits bypass this
// slot and render the full page route instead.
type Props = {
  params: Promise<{ id: string; slug: string }>
}

export default async function NuggetDetailSheetRoute({ params }: Props) {
  const { id, slug } = await params
  const canonicalSlug = await getCanonicalArticleSlug(id)

  if (!canonicalSlug) {
    notFound()
  }

  if (canonicalSlug !== slug) {
    permanentRedirect(`/nuggets/${id}/${canonicalSlug}`)
  }

  return (
    <Sheet ariaLabel="Nugget detail">
      <Suspense fallback={<ArticleDetailSkeleton />}>
        <ArticleContent id={id} inSheet />
      </Suspense>
    </Sheet>
  )
}
