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
