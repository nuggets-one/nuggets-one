import { CONTENT_STREAMS } from '@/types/article'

export type TopicPushKind = 'immediate' | 'digest'

export type TopicPushRowRef = {
  kind: TopicPushKind
  article_id: string | null
  batch_key: string | null
}

/** FCM Android notification tag — per-article so digest rows do not replace each other. */
export function topicPushAndroidTag(row: TopicPushRowRef): string | undefined {
  if (row.article_id) return `article:${row.article_id}`
  if (row.kind === 'digest' && row.batch_key) return `digest:${row.batch_key}`
  return undefined
}

export function topicPushCollapseKey(row: TopicPushRowRef): string | undefined {
  return topicPushAndroidTag(row)
}

export function topicPushWebTopic(row: TopicPushRowRef): string | undefined {
  if (row.article_id) return `article-${row.article_id}`
  if (row.batch_key) return `digest-${row.batch_key}`
  return undefined
}

export function topicPushApnsCollapseId(row: TopicPushRowRef): string | undefined {
  return topicPushCollapseKey(row)
}

export const WEB_PUSH_NOTIFICATION = {
  icon: 'https://nuggets.one/icons/icon-192.png',
  badge: 'https://nuggets.one/icons/badge-72.png',
  siteUrl: 'https://www.nuggets.one',
} as const

export function topicPushWebDeepLink(
  articleId: string | null,
  slug: string | null,
  stream: string,
  siteUrl = WEB_PUSH_NOTIFICATION.siteUrl
): string {
  const base = siteUrl.replace(/\/$/, '')
  if (articleId && slug) return `${base}/nuggets/${articleId}/${slug}`
  if ((CONTENT_STREAMS as readonly string[]).includes(stream)) {
    return `${base}/?stream=${stream}`
  }
  return base
}

export type TopicWebpushInput = {
  title: string
  body: string
  kind: TopicPushKind
  article_id: string | null
  batch_key: string | null
  slug: string | null
  content_stream: string
  imageUrl?: string
}

/** FCM webpush block — title/body/link are required for reliable browser OS notifications. */
export function buildTopicWebpushBlock(row: TopicWebpushInput): {
  headers: Record<string, string>
  notification: Record<string, string>
  fcm_options: { link: string }
} {
  const webTopic = topicPushWebTopic(row)
  const link = topicPushWebDeepLink(row.article_id, row.slug, row.content_stream)

  return {
    headers: {
      TTL: row.kind === 'immediate' ? '86400' : '43200',
      Urgency: row.kind === 'immediate' ? 'high' : 'normal',
      ...(webTopic ? { Topic: webTopic } : {}),
    },
    notification: {
      title: row.title,
      body: row.body,
      icon: WEB_PUSH_NOTIFICATION.icon,
      badge: WEB_PUSH_NOTIFICATION.badge,
      ...(row.imageUrl ? { image: row.imageUrl } : {}),
    },
    fcm_options: { link },
  }
}
