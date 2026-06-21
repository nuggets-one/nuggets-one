import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getStreamLabel,
  parseContentStream,
  STREAM_INTRO_COPY,
} from '../../../lib/copy/streams'
import {
  GEOPOLITICS_TAG_SLUG,
  inferContentStreamFromTags,
  TECH_VC_TAG_SLUGS,
  validateStreamTagMembership,
} from '../../../lib/feed/stream-membership'
import {
  isScopeEnabledStream,
  isScopeDisabledStream,
  resolveEffectiveContentStream,
  buildFeedHrefForContentStream,
  buildChartsScopeHref,
  getScopesForStream,
} from '../../../lib/feed/scope'

test('parseContentStream accepts all streams and defaults unknown to standard', () => {
  assert.equal(parseContentStream('charts'), 'charts')
  assert.equal(parseContentStream('tech_vc'), 'tech_vc')
  assert.equal(parseContentStream('geopolitics'), 'geopolitics')
  assert.equal(parseContentStream('invalid'), 'standard')
})

test('getStreamLabel returns full and short labels for new streams', () => {
  assert.equal(getStreamLabel('tech_vc'), 'Tech x VC')
  assert.equal(getStreamLabel('tech_vc', 'short'), 'Tech')
  assert.equal(getStreamLabel('geopolitics'), 'Geopolitics')
  assert.equal(STREAM_INTRO_COPY.geopolitics.shortLabel, 'Geo')
})

test('inferContentStreamFromTags prefers geopolitics over tech tags', () => {
  assert.equal(inferContentStreamFromTags(['technology']), 'tech_vc')
  assert.equal(inferContentStreamFromTags(['ai', 'pe-vc']), 'tech_vc')
  assert.equal(
    inferContentStreamFromTags(['geopolitics', 'technology']),
    'geopolitics'
  )
})

test('validateStreamTagMembership enforces stream tag rules', () => {
  assert.equal(validateStreamTagMembership('geopolitics', [GEOPOLITICS_TAG_SLUG]), true)
  assert.equal(validateStreamTagMembership('geopolitics', ['technology']), false)
  assert.equal(validateStreamTagMembership('tech_vc', [TECH_VC_TAG_SLUGS[0]]), true)
  assert.equal(validateStreamTagMembership('standard', []), true)
})

test('scope helpers include tech_vc only for India/Global streams', () => {
  assert.equal(isScopeEnabledStream('tech_vc'), true)
  assert.equal(isScopeEnabledStream('geopolitics'), false)
  assert.equal(isScopeDisabledStream('geopolitics'), true)
  assert.equal(isScopeDisabledStream('tech_vc'), false)
  assert.equal(isScopeDisabledStream('charts'), true)
})

test('resolveEffectiveContentStream maps pulse charts scope to charts corpus', () => {
  assert.equal(resolveEffectiveContentStream('pulse', 'charts'), 'charts')
  assert.equal(resolveEffectiveContentStream('pulse', 'global'), 'pulse')
  assert.equal(resolveEffectiveContentStream('pulse', 'india'), 'pulse')
  assert.equal(resolveEffectiveContentStream('standard', 'charts'), 'standard')
})

test('charts scope tab only on pulse stream', () => {
  assert.deepEqual(getScopesForStream('pulse'), ['global', 'india', 'charts'])
  assert.deepEqual(getScopesForStream('standard'), ['global', 'india'])
  assert.deepEqual(getScopesForStream('tech_vc'), ['global', 'india'])
})

test('buildFeedHrefForContentStream routes charts under pulse', () => {
  assert.equal(buildFeedHrefForContentStream('charts'), buildChartsScopeHref())
  assert.equal(buildFeedHrefForContentStream('pulse'), '/?stream=pulse')
  assert.equal(buildFeedHrefForContentStream('standard'), '/')
})
