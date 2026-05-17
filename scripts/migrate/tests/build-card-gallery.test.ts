import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCardGalleryImages } from '../../../lib/ui/build-card-gallery'

test('prepends hero when media has supporting images', () => {
  const hero = 'https://res.cloudinary.com/demo/image/upload/hero.jpg'
  const media = [
    { url: 'https://res.cloudinary.com/demo/image/upload/a.jpg', alt: null },
    { url: 'https://res.cloudinary.com/demo/image/upload/b.jpg', alt: null },
  ]
  const { displayImages, totalImageCount } = buildCardGalleryImages(hero, media, 2)
  assert.equal(displayImages.length, 3)
  assert.equal(displayImages[0]?.url, hero)
  assert.equal(totalImageCount, 3)
})

test('dedupes hero when already in media list', () => {
  const hero = 'https://res.cloudinary.com/demo/image/upload/a.jpg'
  const media = [
    { url: hero, alt: null },
    { url: 'https://res.cloudinary.com/demo/image/upload/b.jpg', alt: null },
  ]
  const { displayImages, totalImageCount } = buildCardGalleryImages(hero, media, 2)
  assert.equal(displayImages.length, 2)
  assert.equal(totalImageCount, 2)
})

test('totalImageCount reflects media rows beyond displayed cap', () => {
  const media = Array.from({ length: 4 }, (_, i) => ({
    url: `https://res.cloudinary.com/demo/image/upload/${i}.jpg`,
    alt: null,
  }))
  const { displayImages, totalImageCount } = buildCardGalleryImages(null, media, 11)
  assert.equal(displayImages.length, 4)
  assert.equal(totalImageCount, 11)
})
