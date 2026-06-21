import assert from 'node:assert/strict'
import test from 'node:test'
import { parseOgTagsFromHtml, parseOgImageFromHtml } from '../../../lib/admin/parse-og-tags.ts'
import { validateOutboundUrl } from '../../../lib/admin/ssrf-guard.ts'
import { suggestStreamFromText, suggestTagsFromText } from '../../../lib/admin/suggest-tags-from-text.ts'

const SAMPLE_HTML = `<!doctype html>
<html>
<head>
  <meta property="og:title" content="Sample Article &amp; Notes" />
  <meta property="og:description" content="A short summary." />
  <meta property="og:image" content="/images/cover.jpg" />
  <title>Fallback title</title>
</head>
<body></body>
</html>`

test('parseOgTagsFromHtml extracts title, description, and absolute image', () => {
  const parsed = parseOgTagsFromHtml(SAMPLE_HTML, 'https://example.com/post')
  assert.equal(parsed.title, 'Sample Article & Notes')
  assert.equal(parsed.description, 'A short summary.')
  assert.equal(parsed.imageUrl, 'https://example.com/images/cover.jpg')
})

test('parseOgImageFromHtml returns image only', () => {
  assert.equal(
    parseOgImageFromHtml(SAMPLE_HTML, 'https://example.com/post'),
    'https://example.com/images/cover.jpg',
  )
})

test('validateOutboundUrl rejects localhost', async () => {
  const result = await validateOutboundUrl('http://127.0.0.1/secret')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'blocked_host')
})

test('validateOutboundUrl rejects link-local metadata host', async () => {
  const result = await validateOutboundUrl('http://169.254.169.254/latest/meta-data/')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'blocked_host')
})

test('validateOutboundUrl rejects non-http protocols', async () => {
  const result = await validateOutboundUrl('file:///etc/passwd')
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'invalid_url')
})

test('validateOutboundUrl accepts public https URL', async () => {
  const result = await validateOutboundUrl('https://example.com/article')
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.url.hostname, 'example.com')
})

test('suggestTagsFromText matches keyword and label rules', () => {
  const officialTags = [
    { slug: 'ai', label: 'AI', dimension: 'subtopic' },
    { slug: 'geopolitics', label: 'Geopolitics', dimension: 'domain' },
    { slug: 'podcast', label: 'Podcast', dimension: 'format' },
  ]

  const slugs = suggestTagsFromText('AI geopolitics podcast interview with founder', officialTags)
  assert.ok(slugs.includes('ai'))
  assert.ok(slugs.includes('geopolitics'))
  assert.ok(slugs.includes('podcast'))
})

test('suggestStreamFromText detects charts vocabulary', () => {
  assert.equal(suggestStreamFromText('Weekly chart on inflation data viz'), 'charts')
  assert.equal(suggestStreamFromText('Plain headline'), null)
})
