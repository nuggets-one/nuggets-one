import assert from 'node:assert/strict'
import test from 'node:test'
import {
  displayNameFromUserMetadata,
  resolveAvatarDisplayName,
} from '../../../lib/ui/resolve-display-name'

test('resolveAvatarDisplayName prefers profile over user_metadata', () => {
  assert.equal(
    resolveAvatarDisplayName('  Ada  ', { full_name: 'Bob Smith', display_name: 'ignored' }),
    'Ada'
  )
})

test('resolveAvatarDisplayName falls back to metadata when profile empty', () => {
  assert.equal(
    resolveAvatarDisplayName(null, { preferred_username: 'carol' }),
    'carol'
  )
  assert.equal(resolveAvatarDisplayName('   ', { name: 'Dan' }), 'Dan')
  assert.equal(resolveAvatarDisplayName(undefined, { username: 'eve' }), 'eve')
})

test('resolveAvatarDisplayName returns null when nothing usable', () => {
  assert.equal(resolveAvatarDisplayName(null, null), null)
  assert.equal(resolveAvatarDisplayName(null, {}), null)
})

test('displayNameFromUserMetadata key order', () => {
  assert.equal(
    displayNameFromUserMetadata({
      full_name: 'Full',
      name: 'Name',
      display_name: 'Display',
    }),
    'Full'
  )
})
