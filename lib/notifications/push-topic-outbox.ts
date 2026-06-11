import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'
import { streamPushLabel } from '@/lib/notifications/push-digest'
import { topicForStream, type PushStream } from '@/lib/notifications/push-topics'
import type { PushTopicOutboxRow } from '@/lib/notifications/push-send'

const MAX_TOPIC_ATTEMPTS = 15

export type DigestArticlePushInput = {
  articleId: string
  title: string
  slug: string
  imageUrl?: string | null
}

export async function enqueueImmediateTopicPush({
  articleId,
  stream,
  title,
  slug,
  imageUrl,
}: {
  articleId: string
  stream: PushStream
  title: string
  slug: string
  imageUrl?: string | null
}): Promise<number> {
  const adminClient = getAdminClient()
  const { error } = await adminClient.from('push_topic_outbox').insert({
    topic: topicForStream(stream),
    kind: 'immediate',
    article_id: articleId,
    title: streamPushLabel(stream),
    body: title,
    slug,
    batch_key: null,
    content_stream: stream,
    data: {
      articleId,
      slug,
      stream,
      groupKey: `nuggets-${stream}`,
      ...(imageUrl ? { imageUrl } : {}),
    },
  })

  if (error?.code === '23505') return 0

  if (error) {
    throw new Error(`enqueueImmediateTopicPush: ${error.message}`)
  }

  return 1
}

export async function enqueueDigestArticleTopicPushes({
  batchKey,
  stream,
  articles,
}: {
  batchKey: string
  stream: PushStream
  articles: DigestArticlePushInput[]
}): Promise<number> {
  if (articles.length === 0) return 0

  const adminClient = getAdminClient()
  let enqueued = 0

  for (const article of articles) {
    const { error } = await adminClient.from('push_topic_outbox').insert({
      topic: topicForStream(stream),
      kind: 'digest',
      article_id: article.articleId,
      title: streamPushLabel(stream),
      body: article.title,
      slug: article.slug,
      batch_key: batchKey,
      content_stream: stream,
      data: {
        stream,
        batchKey,
        articleId: article.articleId,
        slug: article.slug,
        groupKey: `nuggets-${stream}`,
        ...(article.imageUrl ? { imageUrl: article.imageUrl } : {}),
      },
    })

    if (error?.code === '23505') continue

    if (error) {
      throw new Error(`enqueueDigestArticleTopicPushes: ${error.message}`)
    }

    enqueued += 1
  }

  return enqueued
}

export async function fetchUnsentTopicRows(limit: number): Promise<PushTopicOutboxRow[]> {
  const adminClient = getAdminClient()
  const { data, error } = await adminClient
    .from('push_topic_outbox')
    .select('id, topic, kind, article_id, title, body, slug, batch_key, content_stream, data, attempts')
    .is('sent_at', null)
    .lt('attempts', MAX_TOPIC_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`fetchUnsentTopicRows: ${error.message}`)
  return (data ?? []) as PushTopicOutboxRow[]
}

export async function markTopicSent(id: string): Promise<void> {
  const adminClient = getAdminClient()
  const { error } = await adminClient
    .from('push_topic_outbox')
    .update({ sent_at: new Date().toISOString(), last_error: null })
    .eq('id', id)

  if (error) throw new Error(`markTopicSent: ${error.message}`)
}

export async function recordTopicFailure(
  id: string,
  message: string,
  attempts: number
): Promise<void> {
  const adminClient = getAdminClient()
  const nextAttempts = attempts + 1
  const { error } = await adminClient
    .from('push_topic_outbox')
    .update({
      attempts: nextAttempts,
      last_error: message.slice(0, 2000),
      ...(nextAttempts >= MAX_TOPIC_ATTEMPTS ? { sent_at: new Date().toISOString() } : {}),
    })
    .eq('id', id)

  if (error) {
    console.warn('[push-topic-outbox] failure update failed:', error.message)
  }
}
