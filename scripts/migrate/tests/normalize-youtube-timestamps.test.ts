import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeParenTimestampsInMarkdown } from '../../../lib/markdown/normalize-youtube-timestamps.ts'

test('normalizeParenTimestampsInMarkdown converts MM:SS', () => {
  const out = normalizeParenTimestampsInMarkdown('See (05:20) for context.')
  assert.equal(out, 'See [05:20](#yt=320) for context.')
})

test('normalizeParenTimestampsInMarkdown converts H:MM:SS', () => {
  const out = normalizeParenTimestampsInMarkdown('Jump to (1:23:45) here.')
  assert.equal(out, 'Jump to [1:23:45](#yt=5025) here.')
})

test('normalizeParenTimestampsInMarkdown skips inside markdown links', () => {
  const input = 'Already [linked](https://example.com?t=(05:20)) intact.'
  assert.equal(normalizeParenTimestampsInMarkdown(input), input)
})

test('normalizeParenTimestampsInMarkdown leaves existing #yt links', () => {
  const input = 'Use [2:34](#yt=154) as canonical.'
  assert.equal(normalizeParenTimestampsInMarkdown(input), input)
})

test('normalizeParenTimestampsInMarkdown converts bracket H:MM:SS', () => {
  const out = normalizeParenTimestampsInMarkdown('Quote [00:04:10] here.')
  assert.equal(out, 'Quote [00:04:10](#yt=250) here.')
})

test('normalizeParenTimestampsInMarkdown converts bracket MM:SS', () => {
  const out = normalizeParenTimestampsInMarkdown('At [04:10] he says.')
  assert.equal(out, 'At [04:10](#yt=250) he says.')
})

test('normalizeParenTimestampsInMarkdown leaves [00:00:00] placeholders (zero offset)', () => {
  const input = '**Episode** [00:00:00]\n\n- **Podcast:** show'
  assert.equal(normalizeParenTimestampsInMarkdown(input), input)
})

test('normalizeParenTimestampsInMarkdown does not alter [00:04:10](#yt=…)', () => {
  const input = 'x [00:04:10](#yt=250) y'
  assert.equal(normalizeParenTimestampsInMarkdown(input), input)
})
