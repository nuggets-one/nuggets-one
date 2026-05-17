import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeHeroThumbUrl } from '../../../lib/ui/normalize-hero-thumb-url'

test('normalizeHeroThumbUrl maps img.youtube.com to i.ytimg.com', () => {
  const out = normalizeHeroThumbUrl(
    'https://img.youtube.com/vi/wT3oHqVFGG4/maxresdefault.jpg'
  )
  assert.equal(out, 'https://i.ytimg.com/vi/wT3oHqVFGG4/hqdefault.jpg')
})

test('normalizeHeroThumbUrl maps youtube.com watch URLs to poster', () => {
  const out = normalizeHeroThumbUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  assert.equal(out, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
})

test('normalizeHeroThumbUrl leaves Cloudinary URLs unchanged', () => {
  const url =
    'https://res.cloudinary.com/clubstorage/image/upload/v1/uploads/foo.png'
  assert.equal(normalizeHeroThumbUrl(url), url)
})
