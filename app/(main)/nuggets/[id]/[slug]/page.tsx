import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getArticleMeta, getCanonicalArticleSlug } from '@/lib/queries/article'
import { buildOgDescription } from '@/lib/seo/og-description'
import { buildOgImageMetadata, resolveOgImageUrl } from '@/lib/seo/og-image'
import { buildOgPageTitle } from '@/lib/seo/og-title'
import { getSiteUrl } from '@/lib/seo/site-url'
import { ArticleContent } from '@/components/ui/article-content'
import { ArticleDetailSkeleton } from '@/components/ui/article-detail-skeleton'

// Per-user bookmark state uses cookies — route is dynamic. Article body is cached via `revalidateTag('article:' + id)` on publish.
type Params = {
  id: string
  slug: string
}

type Props = {
  params: Promise<Params>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const meta = await getArticleMeta(id)

  if (!meta) {
    return { title: 'Nugget not found' }
  }

  const pageTitle = buildOgPageTitle(meta.title)
  const description = buildOgDescription(meta.excerpt)
  const canonicalUrl = `${getSiteUrl()}/nuggets/${id}/${meta.slug}`
  const ogImageUrl = resolveOgImageUrl(meta.hero_thumb_url)

  return {
    title: { absolute: pageTitle },
    description,
    openGraph: {
      title: pageTitle,
      description,
      type: 'article',
      url: canonicalUrl,
      images: buildOgImageMetadata(meta.hero_thumb_url, meta.title),
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  }
}

export default async function NuggetPage({ params }: Props) {
  const { id, slug } = await params
  const canonicalSlug = await getCanonicalArticleSlug(id)

  if (!canonicalSlug) {
    notFound()
  }

  if (canonicalSlug !== slug) {
    permanentRedirect(`/nuggets/${id}/${canonicalSlug}`)
  }

  // Full-page shell for the canonical nugget detail route. Feed-originated
  // in-app opens may render the same route through the intercepted sheet.
  return (
    <Suspense fallback={<ArticleDetailSkeleton />}>
      <ArticleContent id={id} />
    </Suspense>
  )
}
