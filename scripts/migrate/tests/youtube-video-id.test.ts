import assert from 'node:assert/strict'
import test from 'node:test'
import { extractYouTubeVideoId, isCanonicalYouTubeVideoId } from '../../../lib/ui/youtube-video-id.ts'

test('extractYouTubeVideoId from live URL', () => {
  const id = extractYouTubeVideoId(
    'https://www.youtube.com/live/YzFIUrdyleQ?si=KsQWwhjrrpIuJ68D',
  )
  assert.equal(id, 'YzFIUrdyleQ')
  assert.equal(isCanonicalYouTubeVideoId(id!), true)
})

test('extractYouTubeVideoId from youtu.be short link', () => {
  const id = extractYouTubeVideoId('https://youtu.be/e_2opghuq88?si=635YYsgR3ol13e64')
  assert.equal(id, 'e_2opghuq88')
})

test('extractYouTubeVideoId from watch URL', () => {
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    'dQw4w9WgXcQ',
  )
})

test('extractYouTubeVideoId from ytimg poster URL', () => {
  assert.equal(
    extractYouTubeVideoId('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'),
    'dQw4w9WgXcQ',
  )
})

test('extractYouTubeVideoId ignores v= cache-buster on non-YouTube CDN hosts', () => {
  const jpmChart =
    'https://cdn.jpmorganfunds.com/content/dam/jpm-am-aem/americas/us/en/insights/market-insights/wmr/chart_of_the_week.png?v=1780907738879'
  assert.equal(extractYouTubeVideoId(jpmChart), null)
})
