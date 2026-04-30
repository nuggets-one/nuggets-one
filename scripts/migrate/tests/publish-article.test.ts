import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePublishPayload } from '../../../lib/validation/publish-article'

test('S6-F3: publish validation blocks invalid title/body', () => {
  assert.throws(
    () =>
      normalizePublishPayload({
        title: '   ',
        content_markdown: 'Body',
        content_stream: 'standard',
        source_url: null,
        excerpt: null,
      }),
    /title_required/
  )

  assert.throws(
    () =>
      normalizePublishPayload({
        title: 'Valid title',
        content_markdown: '   ',
        content_stream: 'standard',
        source_url: null,
        excerpt: null,
      }),
    /body_required/
  )
})

test('S6-F3: excerpt auto-fills when blank', () => {
  const payload = normalizePublishPayload({
    title: 'Valid title',
    content_markdown: 'This is a markdown body for excerpt generation.',
    content_stream: 'standard',
    source_url: null,
    excerpt: ' ',
  })

  assert.equal(payload.excerpt.startsWith('This is a markdown body'), true)
})
