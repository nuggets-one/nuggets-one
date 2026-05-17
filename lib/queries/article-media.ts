import { getPublicClient } from '@/lib/supabase/public'
import { isGalleryImageUrl } from '@/lib/ui/gallery-image-url'
import type { CardImage } from '@/types/article'

const MAX_GALLERY_CELLS = 4

export type ArticleGalleryMedia = {
  /** Up to 4 cells for grid display. */
  images: CardImage[]
  imageCount: number
  /** All eligible gallery rows (for lightbox). */
  allImages: CardImage[]
}

/**
 * Image rows from `article_media` for card/detail galleries.
 * PDFs and non-image URLs are excluded.
 */
export async function getArticleGalleryMedia(
  articleId: string
): Promise<ArticleGalleryMedia> {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('article_media')
    .select('url, sort_order')
    .eq('article_id', articleId)
    .eq('kind', 'image')
    .order('sort_order', { ascending: true })

  if (error) {
    console.warn(`getArticleGalleryMedia: ${error.message}`)
    return { images: [], imageCount: 0, allImages: [] }
  }

  type MediaRow = { url: string; sort_order: number }
  const rows = (data ?? []) as MediaRow[]
  const eligible = rows.filter((row) => isGalleryImageUrl(row.url))
  const allImages = eligible.map((row) => ({ url: row.url.trim(), alt: null }))

  return {
    images: allImages.slice(0, MAX_GALLERY_CELLS),
    imageCount: eligible.length,
    allImages,
  }
}
