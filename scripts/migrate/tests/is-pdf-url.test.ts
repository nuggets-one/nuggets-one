import assert from 'node:assert/strict'
import test from 'node:test'
import { isPdfUrl } from '../../../lib/ui/is-pdf-url'

test('isPdfUrl detects pdf paths', () => {
  assert.equal(isPdfUrl('https://kkr.com/doc.pdf'), true)
  assert.equal(isPdfUrl('https://kkr.com/doc.PDF?x=1'), true)
  assert.equal(isPdfUrl('https://kkr.com/image.png'), false)
  assert.equal(isPdfUrl(null), false)
})
