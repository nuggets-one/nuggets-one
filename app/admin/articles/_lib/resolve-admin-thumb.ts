import { youTubePosterHqUrl } from '@/lib/ui/excerpt-card'
import { normalizeHeroThumbUrl } from '@/lib/ui/normalize-hero-thumb-url'
import type { AdminArticleRow } from '@/lib/queries/articles-admin'

export function resolveAdminArticleThumb(row: AdminArticleRow): {
  url: string | null
  alt: string
} {
  const alt = row.hero_alt_text?.trim() || row.title

  const normalized = normalizeHeroThumbUrl(row.hero_thumb_url)
  if (normalized) {
    return { url: normalized, alt }
  }

  if (row.hero_media_kind === 'youtube' && row.hero_video_id) {
    return { url: youTubePosterHqUrl(row.hero_video_id), alt }
  }

  return { url: null, alt }
}
