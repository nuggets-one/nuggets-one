import assert from 'node:assert/strict'
import test from 'node:test'
import { needsLegacyGallerySync } from '../legacy-article-media'

test('needsLegacyGallerySync when hero exists but gallery rows missing', () => {
  const resolved = {
    cardMedia: [
      { url: 'https://a.com/1.jpg', kind: 'image' as const, video_id: null, hero_thumb_url: 'https://a.com/1.jpg', sort_order: 0 },
      { url: 'https://a.com/2.jpg', kind: 'image' as const, video_id: null, hero_thumb_url: 'https://a.com/2.jpg', sort_order: 1 },
    ],
    heroIndex: 0,
    source_url: null,
    fullGallery: [],
  }
  assert.equal(needsLegacyGallerySync(1, resolved), true)
  assert.equal(needsLegacyGallerySync(2, resolved), false)
})
