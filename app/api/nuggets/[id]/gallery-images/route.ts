import { NextResponse } from 'next/server'
import { getArticleById } from '@/lib/queries/article'
import { getArticleGalleryMedia } from '@/lib/queries/article-media'
import { buildLightboxImages } from '@/lib/ui/build-lightbox-images'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params

  let article
  try {
    article = await getArticleById(id)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (article.hero_media_kind === 'youtube') {
    return NextResponse.json({ error: 'Not an image gallery' }, { status: 404 })
  }

  const gallery = await getArticleGalleryMedia(id)
  const heroThumb = article.hero_thumb_url?.trim() || null
  const images = buildLightboxImages(heroThumb, gallery.allImages)

  if (images.length === 0) {
    return NextResponse.json({ error: 'No images' }, { status: 404 })
  }

  return NextResponse.json(
    { images, title: article.title },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  )
}
