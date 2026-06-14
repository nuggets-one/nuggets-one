import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildDigestBatchKey,
  isDigestWindowClosed,
  streamPushLabel,
} from '../../../lib/notifications/push-digest-keys'
import {
  topicPushAndroidTag,
  topicPushApnsCollapseId,
  topicPushCollapseKey,
  topicPushWebTopic,
  WEB_PUSH_NOTIFICATION,
  buildTopicWebpushBlock,
} from '../../../lib/notifications/push-fcm-payload'

test('buildDigestBatchKey aligns to interval window start', () => {
  const key = buildDigestBatchKey('standard', new Date('2026-06-11T10:45:00.000Z'), 3)
  assert.equal(key, 'standard:2026-06-11 09:00')
})

test('isDigestWindowClosed is false before window end', () => {
  const batchKey = 'standard:2026-06-11 09:00'
  const closed = isDigestWindowClosed(batchKey, 3, new Date('2026-06-11T11:30:00.000Z'))
  assert.equal(closed, false)
})

test('isDigestWindowClosed is true at or after window end', () => {
  const batchKey = 'standard:2026-06-11 09:00'
  assert.equal(isDigestWindowClosed(batchKey, 3, new Date('2026-06-11T12:00:00.000Z')), true)
  assert.equal(isDigestWindowClosed(batchKey, 3, new Date('2026-06-11T12:30:00.000Z')), true)
})

test('streamPushLabel maps streams', () => {
  assert.equal(streamPushLabel('standard'), 'Nuggets')
  assert.equal(streamPushLabel('pulse'), 'Market Pulse')
  assert.equal(streamPushLabel('charts'), 'Charts of the Week')
})

test('digest topic push uses per-article android tag and collapse key', () => {
  const row = {
    kind: 'digest' as const,
    article_id: 'abc-123',
    batch_key: 'standard:2026-06-11 09:00',
  }

  assert.equal(topicPushAndroidTag(row), 'article:abc-123')
  assert.equal(topicPushCollapseKey(row), 'article:abc-123')
  assert.equal(topicPushApnsCollapseId(row), 'article:abc-123')
  assert.equal(topicPushWebTopic(row), 'article-abc-123')
})

test('immediate topic push uses per-article android tag', () => {
  const row = {
    kind: 'immediate' as const,
    article_id: 'def-456',
    batch_key: null,
  }

  assert.equal(topicPushAndroidTag(row), 'article:def-456')
  assert.equal(topicPushWebTopic(row), 'article-def-456')
})

test('WEB_PUSH_NOTIFICATION uses production icon and badge URLs', () => {
  assert.equal(WEB_PUSH_NOTIFICATION.icon, 'https://nuggets.one/icons/icon-192.png')
  assert.equal(WEB_PUSH_NOTIFICATION.badge, 'https://nuggets.one/icons/badge-72.png')
})

test('buildTopicWebpushBlock includes title, body, and deep link', () => {
  const block = buildTopicWebpushBlock({
    title: 'Nuggets',
    body: 'Test headline',
    kind: 'immediate',
    article_id: 'abc-123',
    batch_key: null,
    slug: 'test-slug',
    content_stream: 'standard',
  })
  assert.equal(block.notification.title, 'Nuggets')
  assert.equal(block.notification.body, 'Test headline')
  assert.equal(block.fcm_options.link, 'https://www.nuggets.one/nuggets/abc-123/test-slug')
})
