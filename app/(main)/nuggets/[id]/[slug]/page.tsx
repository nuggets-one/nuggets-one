import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getArticleMeta, getCanonicalArticleSlug } from '@/lib/queries/article'
import { ArticleContent } from '@/components/ui/article-content'
import { ArticleDetailSkeleton } from '@/components/ui/article-detail-skeleton'

// Bookmark check requires cookies — serves dynamically per user.
// ISR via revalidateTag('article:' + id) is deferred to PR-14 when PPR is added.
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuggets.one'
  const defaultOgImage = `${siteUrl}/og-default.png`

  if (!meta) {
    return { title: 'Nugget not found — Nuggets' }
  }

  return {
    title: `${meta.title} — Nuggets`,
    description: meta.excerpt ?? undefined,
    openGraph: {
      title: meta.title,
      description: meta.excerpt ?? undefined,
      type: 'article',
      url: `${siteUrl}/nuggets/${id}/${meta.slug}`,
      images: [
        {
          url: meta.hero_thumb_url ?? defaultOgImage,
          width: 1200,
          height: 630,
          alt: meta.title,
        },
      ],
    },
    twitter: { card: 'summary_large_image' },
    alternates: {
      canonical: `${siteUrl}/nuggets/${id}/${meta.slug}`,
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
