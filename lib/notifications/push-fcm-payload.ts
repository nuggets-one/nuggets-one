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
} as const
