import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DAILY_SINGLE_CAP,
  buildDailyDigestBatchKey,
  digestTitleForOverflow,
  parseOverflowCount,
  partitionRecipientsByDailyCap,
  utcDayStartIso,
} from '../../../lib/notifications/daily-cap'

test('buildDailyDigestBatchKey uses UTC calendar day', () => {
  const key = buildDailyDigestBatchKey('standard', new Date('2026-06-05T15:30:00.000Z'))
  assert.equal(key, 'standard:2026-06-05')
})

test('utcDayStartIso is midnight UTC for the given day', () => {
  assert.equal(
    utcDayStartIso(new Date('2026-06-05T23:59:00.000Z')),
    '2026-06-05T00:00:00.000Z'
  )
})

test('partitionRecipientsByDailyCap splits at DAILY_SINGLE_CAP singles', () => {
  const counts = new Map([
    ['a', 0],
    ['b', DAILY_SINGLE_CAP - 1],
    ['c', DAILY_SINGLE_CAP],
    ['d', DAILY_SINGLE_CAP + 2],
  ])
  const { singleRecipients, overflowRecipients } = partitionRecipientsByDailyCap(
    ['a', 'b', 'c', 'd'],
    counts
  )
  assert.deepEqual(singleRecipients, ['a', 'b'])
  assert.deepEqual(overflowRecipients, ['c', 'd'])
})

test('digestTitleForOverflow formats stream-specific copy', () => {
  assert.equal(digestTitleForOverflow('pulse', 1), '1 more Market Pulse update')
  assert.equal(digestTitleForOverflow('standard', 3), '3 more Deep-Dives updates')
})

test('parseOverflowCount prefers body then title', () => {
  assert.equal(parseOverflowCount('4', null), 4)
  assert.equal(parseOverflowCount(null, '2 more Deep-Dives updates'), 2)
  assert.equal(parseOverflowCount(null, null), 0)
})
