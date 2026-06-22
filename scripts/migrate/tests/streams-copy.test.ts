import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getStreamLabel,
  parseContentStream,
  STREAM_INTRO_COPY,
} from '../../../lib/copy/streams'
import {
  GEOPOLITICS_TAG_SLUG,
  LEADERSHIP_TAG_SLUG,
  TECH_VC_TAG_SLUGS,
  computeSecondaryVisibleStreams,
  computeVisibleStreams,
  inferContentStreamFromTags,
  validateStreamTagMembership,
} from '../../../lib/feed/stream-membership'
import {
  isScopeEnabledStream,
  isScopeDisabledStream,
  resolveEffectiveContentStream,
  buildFeedHrefForContentStream,
  buildChartsScopeHref,
  getScopesForStream,
  isMissingVisibleStreamsColumnError,
  applyFeedStreamFilter,
} from '../../../lib/feed/scope'
import { STREAM_NAV_ORDER } from '../../../lib/copy/streams'
import { topicPushWebDeepLink } from '../../../lib/notifications/push-fcm-payload'

test('parseContentStream accepts all streams and defaults unknown to pulse', () => {
  assert.equal(parseContentStream('charts'), 'charts')
  assert.equal(parseContentStream('tech_vc'), 'tech_vc')
  assert.equal(parseContentStream('geopolitics'), 'geopolitics')
  assert.equal(parseContentStream('leadership'), 'leadership')
  assert.equal(parseContentStream('invalid'), 'pulse')
})

test('STREAM_NAV_ORDER includes leadership in charts former slot', () => {
  assert.deepEqual(STREAM_NAV_ORDER, ['pulse', 'tech_vc', 'standard', 'leadership', 'geopolitics'])
})

test('getStreamLabel returns full and short labels for new streams', () => {
  assert.equal(getStreamLabel('standard'), 'Deep-Dives')
  assert.equal(getStreamLabel('standard', 'short'), 'Dives')
  assert.equal(getStreamLabel('tech_vc'), 'Tech x VC')
  assert.equal(getStreamLabel('tech_vc', 'short'), 'Tech')
  assert.equal(getStreamLabel('geopolitics'), 'Geopolitics')
  assert.equal(getStreamLabel('leadership'), 'Leadership')
  assert.equal(STREAM_INTRO_COPY.geopolitics.shortLabel, 'Geo')
})

test('inferContentStreamFromTags suggests leadership when leadership tag present', () => {
  assert.equal(inferContentStreamFromTags([LEADERSHIP_TAG_SLUG]), 'leadership')
})

test('inferContentStreamFromTags prefers geopolitics over tech tags', () => {
  assert.equal(inferContentStreamFromTags(['technology']), 'tech_vc')
  assert.equal(inferContentStreamFromTags(['ai', 'pe-vc']), 'tech_vc')
  assert.equal(
    inferContentStreamFromTags(['geopolitics', 'technology']),
    'geopolitics'
  )
})

test('computeVisibleStreams includes primary stream and all qualifying tag streams', () => {
  assert.deepEqual(
    computeVisibleStreams('leadership', ['pe-vc', LEADERSHIP_TAG_SLUG]),
    ['tech_vc', 'leadership']
  )
  assert.deepEqual(
    computeVisibleStreams('pulse', ['pe-vc']),
    ['pulse', 'tech_vc']
  )
  assert.deepEqual(
    computeVisibleStreams('standard', ['geopolitics', 'ai']),
    ['standard', 'tech_vc', 'geopolitics']
  )
  assert.deepEqual(computeVisibleStreams('standard', []), ['standard'])
})

test('computeSecondaryVisibleStreams excludes primary stream', () => {
  assert.deepEqual(
    computeSecondaryVisibleStreams('leadership', ['pe-vc', LEADERSHIP_TAG_SLUG]),
    ['tech_vc']
  )
})

test('validateStreamTagMembership enforces stream tag rules', () => {
  assert.equal(validateStreamTagMembership('geopolitics', [GEOPOLITICS_TAG_SLUG]), true)
  assert.equal(validateStreamTagMembership('geopolitics', ['technology']), false)
  assert.equal(validateStreamTagMembership('leadership', [LEADERSHIP_TAG_SLUG]), true)
  assert.equal(validateStreamTagMembership('leadership', ['technology']), false)
  assert.equal(validateStreamTagMembership('tech_vc', [TECH_VC_TAG_SLUGS[0]]), true)
  assert.equal(validateStreamTagMembership('standard', []), true)
})

test('scope helpers include tech_vc only for India/Global streams', () => {
  assert.equal(isScopeEnabledStream('tech_vc'), true)
  assert.equal(isScopeEnabledStream('geopolitics'), false)
  assert.equal(isScopeEnabledStream('leadership'), false)
  assert.equal(isScopeDisabledStream('geopolitics'), true)
  assert.equal(isScopeDisabledStream('leadership'), true)
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
  assert.equal(buildFeedHrefForContentStream('leadership'), '/?stream=leadership')
  assert.equal(buildFeedHrefForContentStream('pulse'), '/')
  assert.equal(buildFeedHrefForContentStream('standard'), '/?stream=standard')
})

test('isMissingVisibleStreamsColumnError detects schema-missing errors', () => {
  assert.equal(isMissingVisibleStreamsColumnError('column articles.visible_streams does not exist'), true)
  assert.equal(isMissingVisibleStreamsColumnError('Could not find column', 'PGRST205'), true)
  assert.equal(isMissingVisibleStreamsColumnError('permission denied for table articles'), false)
})

test('applyFeedStreamFilter switches between visible_streams and content_stream modes', () => {
  const calls: string[] = []
  const query = {
    contains(column: string, value: string[]) {
      calls.push(`contains:${column}:${value.join(',')}`)
      return this
    },
    eq(column: string, value: string) {
      calls.push(`eq:${column}:${value}`)
      return this
    },
  }

  applyFeedStreamFilter(query, 'pulse', 'visible_streams')
  assert.deepEqual(calls, ['contains:visible_streams:pulse'])

  calls.length = 0
  applyFeedStreamFilter(query, 'pulse', 'content_stream')
  assert.deepEqual(calls, ['eq:content_stream:pulse'])
})

test('topicPushWebDeepLink uses canonical feed URLs for stream fallbacks', () => {
  const site = 'https://www.nuggets.one'
  assert.equal(
    topicPushWebDeepLink(null, null, 'pulse', site),
    `${site}/`
  )
  assert.equal(
    topicPushWebDeepLink(null, null, 'charts', site),
    `${site}${buildChartsScopeHref()}`
  )
  assert.equal(
    topicPushWebDeepLink(null, null, 'leadership', site),
    `${site}/?stream=leadership`
  )
  assert.equal(
    topicPushWebDeepLink('abc', 'my-slug', 'charts', site),
    `${site}/nuggets/abc/my-slug`
  )
})
