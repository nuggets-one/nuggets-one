import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSingleNotificationRows } from '../../../lib/notifications/single-rows'

test("S8-F1: kind='single' rows always store batch_key as null", () => {
  const rows = buildSingleNotificationRows({
    recipientIds: ['11111111-1111-1111-1111-111111111111'],
    articleId: '22222222-2222-2222-2222-222222222222',
    stream: 'standard',
    title: 'Article title',
  })

  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.kind, 'single')
  assert.equal(rows[0]?.batch_key, null)
})
