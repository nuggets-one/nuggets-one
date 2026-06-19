import 'server-only'

import { resolvePushImageUrl } from '@/lib/notifications/push-image-url'
import type { getAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof getAdminClient>

/** Resolve push image from article hero or first manual image media row. */
export async function resolvePushImageUrlForArticle(
  adminClient: AdminClient,
  articleId: string,
  heroThumbUrl: string | null | undefined
): Promise<string | null> {
  let candidate = heroThumbUrl?.trim() || null

  if (!candidate) {
    const { data } = await adminClient
      .from('article_media')
      .select('url')
      .eq('article_id', articleId)
      .eq('kind', 'image')
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    candidate = (data?.url as string | null) ?? null
  }

  return resolvePushImageUrl(candidate)
}
