import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildLightboxImages,
  indexOfLightboxImage,
} from '../../../lib/ui/build-lightbox-images'

test('buildLightboxImages prepends hero and includes all media rows', () => {
  const hero = 'https://res.cloudinary.com/demo/image/upload/hero.jpg'
  const media = Array.from({ length: 6 }, (_, i) => ({
    url: `https://res.cloudinary.com/demo/image/upload/${i}.jpg`,
    alt: null,
  }))
  const images = buildLightboxImages(hero, media)
  assert.equal(images.length, 7)
  assert.equal(images[0]?.url, hero)
})

test('buildLightboxImages dedupes hero already in media', () => {
  const hero = 'https://res.cloudinary.com/demo/image/upload/a.jpg'
  const media = [
    { url: hero, alt: null },
    { url: 'https://res.cloudinary.com/demo/image/upload/b.jpg', alt: null },
  ]
  const images = buildLightboxImages(hero, media)
  assert.equal(images.length, 2)
})

test('indexOfLightboxImage maps clicked URL to index', () => {
  const images = [
    { url: 'https://example.com/a.jpg', alt: null },
    { url: 'https://example.com/b.jpg', alt: null },
  ]
  assert.equal(indexOfLightboxImage(images, 'https://example.com/b.jpg'), 1)
  assert.equal(indexOfLightboxImage(images, 'https://example.com/missing.jpg'), 0)
})
