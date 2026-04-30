export function buildSingleNotificationRows({
  recipientIds,
  articleId,
  stream,
  title,
}: {
  recipientIds: string[]
  articleId: string
  stream: 'standard' | 'pulse'
  title: string
}) {
  return recipientIds.map((userId) => ({
    user_id: userId,
    article_id: articleId,
    kind: 'single' as const,
    content_stream: stream,
    title,
    // Audit S8-F1 decision: kind='single' rows must never set batch_key.
    batch_key: null,
    is_read: false,
  }))
}
