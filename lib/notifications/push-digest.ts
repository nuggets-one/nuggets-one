import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import { getPushDigestIntervalHours } from '@/lib/queries/site-settings'
import {
  buildDigestBatchKey,
  isDigestWindowClosed,
  type DigestStream,
} from '@/lib/notifications/push-digest-keys'
import { enqueueDigestArticleTopicPushes } from '@/lib/notifications/push-topic-outbox'

export type { DigestStream } from '@/lib/notifications/push-digest-keys'
export {
  buildDigestBatchKey,
  isDigestWindowClosed,
  parseBatchKeyWindowEnd,
  streamPushLabel,
} from '@/lib/notifications/push-digest-keys'

export async function accumulateDigestBuffer({
  stream,
  articleId,
  title,
  slug,
  imageUrl,
  intervalHours,
}: {
  stream: DigestStream
  articleId: string
  title: string
  slug: string
  imageUrl?: string | null
  intervalHours: number
}): Promise<void> {
  const adminClient = getAdminClient()
  const batchKey = buildDigestBatchKey(stream, new Date(), intervalHours)

  const { data: existingArticle } = await adminClient
    .from('push_digest_buffer_articles')
    .select('article_id')
    .eq('batch_key', batchKey)
    .eq('article_id', articleId)
    .maybeSingle()

  if (existingArticle) {
    const { error } = await adminClient
      .from('push_digest_buffer_articles')
      .update({
        title,
        slug,
        image_url: imageUrl ?? null,
      })
      .eq('batch_key', batchKey)
      .eq('article_id', articleId)
    if (error) console.warn('[accumulateDigestBuffer] article update error:', error.message)
    return
  }

  const { data: existing } = await adminClient
    .from('push_digest_buffer')
    .select('article_count')
    .eq('batch_key', batchKey)
    .maybeSingle()

  if (existing) {
    const { error } = await adminClient
      .from('push_digest_buffer')
      .update({
        article_count: Number(existing.article_count ?? 0) + 1,
        sample_title: title,
        updated_at: new Date().toISOString(),
      })
      .eq('batch_key', batchKey)
    if (error) console.warn('[accumulateDigestBuffer] update error:', error.message)
  } else {
    const { error } = await adminClient.from('push_digest_buffer').insert({
      batch_key: batchKey,
      content_stream: stream,
      article_count: 1,
      sample_title: title,
      interval_hours: intervalHours,
    })
    if (error) console.warn('[accumulateDigestBuffer] insert error:', error.message)
  }

  const { error: articleError } = await adminClient.from('push_digest_buffer_articles').insert({
    batch_key: batchKey,
    article_id: articleId,
    title,
    slug,
    image_url: imageUrl ?? null,
  })

  if (articleError) {
    console.warn('[accumulateDigestBuffer] article insert error:', articleError.message)
  }
}

export async function flushCompletedDigestBuffers(now = new Date()): Promise<number> {
  const adminClient = getAdminClient()
  const { data: buffers, error } = await adminClient.from('push_digest_buffer').select('*')

  if (error) {
    console.warn('[flushCompletedDigestBuffers] fetch error:', error.message)
    return 0
  }

  let flushed = 0

  for (const buffer of buffers ?? []) {
    const batchKey = buffer.batch_key as string
    const stream = buffer.content_stream as DigestStream
    const intervalHours = Number(buffer.interval_hours ?? 1)
    const count = Number(buffer.article_count ?? 0)
    if (count <= 0) continue

    if (!isDigestWindowClosed(batchKey, intervalHours, now)) continue

    const { data: articles, error: articlesError } = await adminClient
      .from('push_digest_buffer_articles')
      .select('article_id, title, slug, image_url')
      .eq('batch_key', batchKey)
      .order('created_at', { ascending: true })

    if (articlesError) {
      console.warn('[flushCompletedDigestBuffers] articles fetch error:', articlesError.message)
      continue
    }

    if (!articles?.length) {
      console.warn('[flushCompletedDigestBuffers] no articles for batch:', batchKey)
      await adminClient.from('push_digest_buffer').delete().eq('batch_key', batchKey)
      continue
    }

    await enqueueDigestArticleTopicPushes({
      batchKey,
      stream,
      articles: articles.map((row) => ({
        articleId: row.article_id as string,
        title: row.title as string,
        slug: row.slug as string,
        imageUrl: (row.image_url as string | null) ?? null,
      })),
    })

    await adminClient.from('push_digest_buffer').delete().eq('batch_key', batchKey)
    flushed += 1
  }

  return flushed
}

export async function getDigestIntervalForPublish(): Promise<number> {
  return getPushDigestIntervalHours()
}
