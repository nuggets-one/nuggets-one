import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseYouTubeInlineNavigation,
  resolveCardPreviewYouTubeClick,
  resolveDetailYouTubeTimestampClick,
} from '../../../lib/ui/youtube-inline-url.ts'

test('parseYouTubeInlineNavigation from live URL with t param', () => {
  const nav = parseYouTubeInlineNavigation(
    'https://www.youtube.com/live/YzFIUrdyleQ?t=268',
  )
  assert.deepEqual(nav, { videoId: 'YzFIUrdyleQ', startSeconds: 268 })
})

test('resolveCardPreviewYouTubeClick intercepts live URL', () => {
  const resolved = resolveCardPreviewYouTubeClick(
    'https://www.youtube.com/live/YzFIUrdyleQ?t=120',
    'YzFIUrdyleQ',
  )
  assert.deepEqual(resolved, { videoId: 'YzFIUrdyleQ', startSeconds: 120 })
})

test('resolveCardPreviewYouTubeClick still handles #yt= hash', () => {
  const resolved = resolveCardPreviewYouTubeClick('#yt=90', 'YzFIUrdyleQ')
  assert.deepEqual(resolved, { videoId: 'YzFIUrdyleQ', startSeconds: 90 })
})

test('resolveDetailYouTubeTimestampClick matches live URL to hero id', () => {
  assert.equal(
    resolveDetailYouTubeTimestampClick(
      'https://www.youtube.com/live/YzFIUrdyleQ?t=45',
      'YzFIUrdyleQ',
    ),
    45,
  )
})

test('resolveDetailYouTubeTimestampClick ignores live URL for different hero', () => {
  assert.equal(
    resolveDetailYouTubeTimestampClick(
      'https://www.youtube.com/live/YzFIUrdyleQ?t=45',
      'dQw4w9WgXcQ',
    ),
    null,
  )
})

test('parseYouTubeInlineNavigation reads time_continue param', () => {
  const nav = parseYouTubeInlineNavigation(
    'https://www.youtube.com/watch?v=YzFIUrdyleQ&time_continue=90',
  )
  assert.deepEqual(nav, { videoId: 'YzFIUrdyleQ', startSeconds: 90 })
})

test('parseYouTubeInlineNavigation prefers t over time_continue', () => {
  const nav = parseYouTubeInlineNavigation(
    'https://www.youtube.com/watch?v=YzFIUrdyleQ&t=30&time_continue=90',
  )
  assert.deepEqual(nav, { videoId: 'YzFIUrdyleQ', startSeconds: 30 })
})
