import assert from 'node:assert/strict'
import test from 'node:test'
import { isGalleryImageUrl } from '../../../lib/ui/gallery-image-url'

test('isGalleryImageUrl rejects PDFs', () => {
  assert.equal(isGalleryImageUrl('https://example.com/report.pdf'), false)
  assert.equal(isGalleryImageUrl('https://res.cloudinary.com/demo/a.jpg'), true)
})
