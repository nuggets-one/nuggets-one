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

test('resolveCardPreviewYouTubeClick parses legacy #yt=MM:SS', () => {
  const resolved = resolveCardPreviewYouTubeClick('#yt=00:04:28', 'YzFIUrdyleQ')
  assert.deepEqual(resolved, { videoId: 'YzFIUrdyleQ', startSeconds: 268 })
})

test('resolveCardPreviewYouTubeClick parses legacy #yt=HH:MM:SS', () => {
  const resolved = resolveCardPreviewYouTubeClick('#yt=01:02:03', 'YzFIUrdyleQ')
  assert.deepEqual(resolved, { videoId: 'YzFIUrdyleQ', startSeconds: 3723 })
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

test('parseYouTubeInlineNavigation fixes youtu.be/ID&t typo (ampersand vs ?)', () => {
  const nav = parseYouTubeInlineNavigation(
    'https://youtu.be/ZfJRd2MJhyU&t=0h4m10s',
  )
  assert.deepEqual(nav, { videoId: 'ZfJRd2MJhyU', startSeconds: 250 })

  const nav2 = parseYouTubeInlineNavigation(
    'https://youtu.be/ZfJRd2MJhyU&t=0h5m57s',
  )
  assert.deepEqual(nav2, { videoId: 'ZfJRd2MJhyU', startSeconds: 357 })
})

test('parseYouTubeInlineNavigation leaves correct youtu.be?t= unchanged', () => {
  const nav = parseYouTubeInlineNavigation('https://youtu.be/ZfJRd2MJhyU?t=0h4m10s')
  assert.deepEqual(nav, { videoId: 'ZfJRd2MJhyU', startSeconds: 250 })
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
