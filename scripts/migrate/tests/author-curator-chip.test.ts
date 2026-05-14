import assert from 'node:assert/strict'
import test from 'node:test'
import { curatorChipFromDisplayName } from '../../../lib/ui/author-curator-chip'

test('curatorChipFromDisplayName uses first + last token', () => {
  assert.equal(curatorChipFromDisplayName('Ada Lovelace'), 'AL')
})

test('curatorChipFromDisplayName uses two letters for single token', () => {
  assert.equal(curatorChipFromDisplayName('nuggets'), 'NU')
})

test('curatorChipFromDisplayName single ASCII letter', () => {
  assert.equal(curatorChipFromDisplayName('X'), 'X')
})

test('curatorChipFromDisplayName empty', () => {
  assert.equal(curatorChipFromDisplayName(null), 'N')
  assert.equal(curatorChipFromDisplayName('   '), 'N')
})

test('curatorChipFromDisplayName strips punctuation between words', () => {
  assert.equal(curatorChipFromDisplayName('Mary-Jane Watson'), 'MW')
})
