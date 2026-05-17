import assert from 'node:assert/strict'
import test from 'node:test'
import {
  collectLegacyGallery,
  needsLegacyMediaRectification,
  resolveLegacyMedia,
  resolveLegacySourceUrl,
} from '../legacy-article-media'

const KKR_CLOUDINARY =
  'https://res.cloudinary.com/clubstorage/image/upload/v1777300806/uploads/693f1f16e994cbb2739036ae/vwgkm7hxycabz28syqq8.png'
const KKR_PDF =
  'https://www.kkr.com/content/dam/kkr/insights/pdf/thoughts-from-the-road-china-april-2026.pdf'

test('resolveLegacySourceUrl prefers sourceUrl over externalLinks', () => {
  assert.equal(
    resolveLegacySourceUrl({
      sourceUrl: KKR_PDF,
      externalLinks: ['https://example.com/other'],
    }),
    KKR_PDF
  )
})

test('KKR pattern: PDF source + Cloudinary in supportingMedia becomes card hero', () => {
  const resolved = resolveLegacyMedia({
    sourceUrl: KKR_PDF,
    primaryMedia: { url: KKR_PDF, type: 'document' },
    supportingMedia: [{ url: KKR_CLOUDINARY, type: 'image' }],
    displayImageIndex: 0,
  })

  assert.equal(resolved.source_url, KKR_PDF)
  assert.equal(resolved.cardMedia.length, 1)
  assert.equal(resolved.cardMedia[0].url, KKR_CLOUDINARY)
  assert.equal(resolved.cardMedia[0].kind, 'image')
  assert.equal(resolved.heroIndex, 0)
})

test('displayImageIndex on PDF falls back to first raster image', () => {
  const resolved = resolveLegacyMedia({
    sourceUrl: KKR_PDF,
    supportingMedia: [{ url: KKR_PDF, type: 'document' }, { url: KKR_CLOUDINARY, type: 'image' }],
    displayImageIndex: 0,
  })

  assert.equal(resolved.cardMedia.length, 1)
  assert.equal(resolved.cardMedia[0].url, KKR_CLOUDINARY)
})

test('needsLegacyMediaRectification when hero is PDF but Mongo has image', () => {
  const resolved = resolveLegacyMedia({
    sourceUrl: KKR_PDF,
    supportingMedia: [{ url: KKR_CLOUDINARY, type: 'image' }],
  })

  assert.equal(
    needsLegacyMediaRectification(
      { hero_thumb_url: KKR_PDF, hero_media_kind: 'image' },
      resolved
    ),
    true
  )
})

test('collectLegacyGallery reads primaryMedia + supportingMedia + images', () => {
  const gallery = collectLegacyGallery({
    primaryMedia: { url: 'https://res.cloudinary.com/a/1.png', type: 'image' },
    supportingMedia: [{ url: 'https://res.cloudinary.com/a/2.png' }],
    images: ['https://res.cloudinary.com/a/3.png'],
  })

  assert.equal(gallery.length, 3)
  assert.equal(gallery[0].originField, 'primaryMedia')
  assert.equal(gallery[1].originField, 'supportingMedia[0]')
  assert.equal(gallery[2].originField, 'images[0]')
})
