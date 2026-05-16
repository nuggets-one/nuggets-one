import assert from 'node:assert/strict'
import test from 'node:test'

function extractYouTubeVideoId(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) return null
  const raw = url.trim()
  const shortMatch = raw.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/)
  if (shortMatch) return shortMatch[1]
  const longMatch = raw.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)
  if (longMatch) return longMatch[1]
  return null
}

test('extractYouTubeVideoId from youtu.be short link', () => {
  const id = extractYouTubeVideoId('https://youtu.be/e_2opghuq88?si=635YYsgR3ol13e64')
  assert.equal(id, 'e_2opghuq88')
})

test('extractYouTubeVideoId from watch URL', () => {
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    'dQw4w9WgXcQ'
  )
})
